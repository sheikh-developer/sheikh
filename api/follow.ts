import { CONFIG, API_HEADERS } from '../github-follower/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface GitHubUser {
    login: string;
    followers: number;
}

interface GitHubRepo {
    stargazers_count: number;
    created_at: string;
    pushed_at: string;
    updated_at: string;
}

interface GitHubEvent {
    created_at: string;
    type: string;
}

interface ActivityItem {
    created_at: string;
    pushed_at?: string;
    updated_at?: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getRandomDelay = () => 
    Math.floor(Math.random() * (CONFIG.ANTI_DETECTION.RANDOM_DELAY_RANGE.MAX - 
        CONFIG.ANTI_DETECTION.RANDOM_DELAY_RANGE.MIN) + 
        CONFIG.ANTI_DETECTION.RANDOM_DELAY_RANGE.MIN);

class RateLimiter {
    private followsInLastMinute: number = 0;
    private lastFollowTime: number = 0;
    private lastResetTime: number = Date.now();

    async waitForRateLimit() {
        const now = Date.now();
        
        // Reset counter if a minute has passed
        if (now - this.lastResetTime >= 60000) {
            this.followsInLastMinute = 0;
            this.lastResetTime = now;
        }

        // Check if we've hit the rate limit
        if (this.followsInLastMinute >= CONFIG.RATE_LIMITS.FOLLOWS_PER_MINUTE) {
            const waitTime = 60000 - (now - this.lastResetTime);
            await sleep(waitTime);
            this.followsInLastMinute = 0;
            this.lastResetTime = Date.now();
        }

        // Ensure minimum delay between follows
        const timeSinceLastFollow = now - this.lastFollowTime;
        if (timeSinceLastFollow < CONFIG.RATE_LIMITS.MIN_DELAY_BETWEEN_FOLLOWS) {
            await sleep(CONFIG.RATE_LIMITS.MIN_DELAY_BETWEEN_FOLLOWS - timeSinceLastFollow);
        }

        this.followsInLastMinute++;
        this.lastFollowTime = Date.now();
    }
}

const rateLimiter = new RateLimiter();

const getAllFollowers = async (): Promise<GitHubUser[]> => {
    const allFollowers: GitHubUser[] = [];
    let page = 1;
    let consecutiveErrors = 0;
    
    while (page <= CONFIG.PAGINATION.MAX_PAGES && allFollowers.length < CONFIG.RATE_LIMITS.MAX_FOLLOWERS) {
        try {
            const res = await fetch(
                `https://api.github.com/users/${CONFIG.TARGET_USER}/followers?page=${page}&per_page=${CONFIG.PAGINATION.PER_PAGE}`,
                { headers: API_HEADERS }
            );
            
            if (res.status === 403) {
                const retryAfter = parseInt(res.headers.get('retry-after') || '60');
                await sleep(retryAfter * 1000);
                continue;
            }
            
            const followers = await res.json() as GitHubUser[];
            if (!followers.length) break;
            
            allFollowers.push(...followers);
            consecutiveErrors = 0;
            await sleep(CONFIG.PAGINATION.DELAY);
            page++;
        } catch (error) {
            consecutiveErrors++;
            if (consecutiveErrors >= CONFIG.ERROR_HANDLING.MAX_CONSECUTIVE_ERRORS) {
                await sleep(CONFIG.ERROR_HANDLING.PAUSE_DURATION);
                consecutiveErrors = 0;
            }
        }
    }
    
    return allFollowers.slice(0, CONFIG.RATE_LIMITS.MAX_FOLLOWERS);
};

const isActiveUser = async (username: string): Promise<boolean> => {
    try {
        const [user, events, repos] = await Promise.all([
            fetch(`https://api.github.com/users/${username}`, { headers: API_HEADERS }),
            fetch(`https://api.github.com/users/${username}/events/public?per_page=${CONFIG.ACTIVITY_CHECK.EVENTS_TO_CHECK}`, 
                { headers: API_HEADERS }),
            fetch(`https://api.github.com/users/${username}/repos?sort=updated`, { headers: API_HEADERS })
        ]);

        const userData = await user.json() as GitHubUser;
        const eventsData = await events.json() as GitHubEvent[];
        const reposData = await repos.json() as GitHubRepo[];

        // Check basic user criteria
        if (userData.followers < CONFIG.ACTIVITY_CHECK.MIN_FOLLOWERS) {
            return false;
        }

        // Check repository criteria
        if (reposData.length < CONFIG.ACTIVITY_CHECK.MIN_REPOS) {
            return false;
        }

        // Check repository stars
        const hasEnoughStars = reposData.some(repo => repo.stargazers_count >= CONFIG.ACTIVITY_CHECK.MIN_STARS);
        if (!hasEnoughStars) {
            return false;
        }

        // Check activity
        if (eventsData.length < CONFIG.ACTIVITY_CHECK.MIN_EVENTS) {
            return false;
        }

        // Convert events and repos to a common activity format
        const activityItems: ActivityItem[] = [
            ...eventsData.map(event => ({ created_at: event.created_at })),
            ...reposData.map(repo => ({
                created_at: repo.created_at,
                pushed_at: repo.pushed_at,
                updated_at: repo.updated_at
            }))
        ];

        const latestActivity = activityItems.reduce((latest, item) => {
            const dates = [
                new Date(item.created_at),
                item.pushed_at ? new Date(item.pushed_at) : null,
                item.updated_at ? new Date(item.updated_at) : null
            ].filter((date): date is Date => date !== null);
            
            return dates.reduce((max, date) => date > max ? date : max, latest);
        }, new Date(0));

        const daysSinceActive = (Date.now() - latestActivity.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceActive < CONFIG.ACTIVITY_CHECK.MAX_DAYS_INACTIVE;
    } catch {
        return false;
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!CONFIG.GITHUB_TOKEN) {
        return res.status(500).json({ error: 'GitHub token not configured' });
    }

    try {
        const followers = await getAllFollowers();
        const activeUsers: string[] = [];
        const processedUsers: string[] = [];
        let errorCount = 0;
        let rateLimitHits = 0;
        let consecutiveActions = 0;

        for (const follower of followers) {
            try {
                processedUsers.push(follower.login);
                
                // Anti-detection: Cool down after too many consecutive actions
                if (consecutiveActions >= CONFIG.ANTI_DETECTION.MAX_CONSECUTIVE_ACTIONS) {
                    await sleep(CONFIG.ANTI_DETECTION.COOL_DOWN_PERIOD);
                    consecutiveActions = 0;
                }

                if (await isActiveUser(follower.login)) {
                    await rateLimiter.waitForRateLimit();
                    
                    const followRes = await fetch(
                        `https://api.github.com/user/following/${follower.login}`,
                        { method: 'PUT', headers: API_HEADERS }
                    );
                    
                    if (followRes.status === 204) {
                        activeUsers.push(follower.login);
                        consecutiveActions++;
                    } else if (followRes.status === 403) {
                        rateLimitHits++;
                        const retryAfter = parseInt(followRes.headers.get('retry-after') || '60');
                        await sleep(retryAfter * 1000);
                    }

                    await sleep(getRandomDelay());
                }
                
                await sleep(CONFIG.ACTIVITY_CHECK.CHECK_INTERVAL);
            } catch (error) {
                errorCount++;
                if (errorCount >= CONFIG.ERROR_HANDLING.ERROR_THRESHOLD) {
                    await sleep(CONFIG.ERROR_HANDLING.PAUSE_DURATION);
                    errorCount = 0;
                }
            }
        }

        return res.status(200).json({ 
            followed: activeUsers,
            processed: processedUsers,
            total_processed: followers.length,
            rate_limit_hits: rateLimitHits,
            errors: errorCount,
            consecutive_actions: consecutiveActions,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
