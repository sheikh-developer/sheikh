import type { NextApiRequest, NextApiResponse } from 'next';
import { CONFIG, API_HEADERS } from '../../config';

interface RateLimitResponse {
    remaining: number;
    reset: number;
    limit: number;
    resources: {
        core: {
            limit: number;
            remaining: number;
            reset: number;
        };
        search: {
            limit: number;
            remaining: number;
            reset: number;
        };
        graphql: {
            limit: number;
            remaining: number;
            reset: number;
        };
    };
}

interface ErrorResponse {
    error: string;
    details?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<RateLimitResponse | ErrorResponse>
) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            details: 'Only GET requests are allowed'
        });
    }

    try {
        // Check if GitHub token is configured
        if (!CONFIG.GITHUB_TOKEN) {
            throw new Error('GitHub token is not configured');
        }

        const response = await fetch('https://api.github.com/rate_limit', {
            headers: API_HEADERS
        });
        
        if (!response.ok) {
            throw new Error(`GitHub API responded with status ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json() as RateLimitResponse;
        
        return res.status(200).json({
            remaining: data.rate.remaining,
            reset: data.rate.reset,
            limit: data.rate.limit,
            resources: {
                core: data.resources.core,
                search: data.resources.search,
                graphql: data.resources.graphql
            }
        });
    } catch (error) {
        console.error('Rate limit check failed:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch rate limit',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
