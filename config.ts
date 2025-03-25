import 'dotenv/config';

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            GITHUB_TOKEN: string;
            TARGET_USER: string;
        }
    }
}

if (!process.env.GITHUB_TOKEN) {
    throw new Error('GitHub token is required. Please set GITHUB_TOKEN in .env.local');
}

if (!process.env.TARGET_USER) {
    throw new Error('Target user is required. Please set TARGET_USER in .env.local');
}

export const CONFIG = {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    TARGET_USER: process.env.TARGET_USER,
    
    // Rate Limiting
    RATE_LIMITS: {
        FOLLOWS_PER_MINUTE: 20,
        MAX_FOLLOWERS: 1000,
        CYCLE_INTERVAL: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
        MIN_DELAY_BETWEEN_FOLLOWS: 3000, // 3 seconds minimum
        MAX_DELAY_BETWEEN_FOLLOWS: 5000, // 5 seconds maximum
        API_RETRY_DELAY: 60 * 1000, // 1 minute
        MAX_RETRIES: 3
    },

    // Activity Checking
    ACTIVITY_CHECK: {
        MAX_DAYS_INACTIVE: 30,
        MIN_REPOS: 3,
        MIN_EVENTS: 5,
        CHECK_INTERVAL: 2000, // 2 seconds between checks
        EVENTS_TO_CHECK: 10, // Number of recent events to analyze
        MIN_STARS: 1, // Minimum stars for repositories
        MIN_FOLLOWERS: 1 // Minimum followers for user
    },

    // Pagination
    PAGINATION: {
        MAX_PAGES: 10,
        PER_PAGE: 100,
        DELAY: 2000, // 2 seconds between page requests
        BACKOFF_FACTOR: 1.5
    },

    // Anti-Detection
    ANTI_DETECTION: {
        USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        RANDOM_DELAY_RANGE: {
            MIN: 2000,
            MAX: 4000
        },
        MAX_CONSECUTIVE_ACTIONS: 50,
        COOL_DOWN_PERIOD: 15 * 60 * 1000 // 15 minutes
    },

    // Error Handling
    ERROR_HANDLING: {
        MAX_CONSECUTIVE_ERRORS: 3,
        ERROR_THRESHOLD: 5,
        PAUSE_DURATION: 15 * 60 * 1000, // 15 minutes
        LOG_ERRORS: true
    },

    // Monitoring
    MONITORING: {
        UPDATE_INTERVAL: 5000,
        MAX_ERRORS_BEFORE_PAUSE: 5,
        PAUSE_DURATION: 15 * 60 * 1000,
        LOG_LEVEL: 'info'
    },

    // Auto-start configuration
    AUTO_START: true
} as const;

export const API_HEADERS = {
    Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': CONFIG.ANTI_DETECTION.USER_AGENT,
    'X-GitHub-Api-Version': '2022-11-28'
} as const;
