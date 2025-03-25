import type { NextApiRequest, NextApiResponse } from 'next';

type CronResponse = {
  success: boolean;
  error?: string;
  message?: string;
};

declare const process: {
  env: {
    VERCEL_URL?: string;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/follow`);
    
    if (!response.ok) {
      throw new Error(`Failed to trigger follow API: ${response.statusText}`);
    }

    res.status(200).json({ 
      success: true,
      message: 'Cron job executed successfully' 
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
