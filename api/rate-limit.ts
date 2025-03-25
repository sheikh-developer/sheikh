import type { VercelRequest, VercelResponse } from '@vercel/node';
import { API_HEADERS } from '../config';

interface RateLimitResponse {
    rate: {
        limit: number;
        remaining: number;
        reset: number;
    };
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const response = await fetch('https://api.github.com/rate_limit', {
            headers: API_HEADERS
        });
        
        if (!response.ok) {
            throw new Error(`GitHub API responded with status ${response.status}`);
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
