import type { VercelRequest, VercelResponse } from '@vercel/node';
import { API_HEADERS } from '../github-follower/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const response = await fetch('https://api.github.com/rate_limit', {
            headers: API_HEADERS
        });
        
        const data = await response.json();
        
        return res.status(200).json({
            remaining: data.rate.remaining,
            reset: data.rate.reset,
            limit: data.rate.limit
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch rate limit' });
    }
}
