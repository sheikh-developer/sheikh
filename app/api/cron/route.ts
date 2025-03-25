import { NextResponse } from 'next/server';
import { CONFIG } from '../../../config';

export async function GET() {
  try {
    // Add your cron job logic here
    // For example, trigger the follower automation
    const response = await fetch(`${process.env.VERCEL_URL}/api/follow`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.GITHUB_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to trigger automation');
    }

    return NextResponse.json({ 
      ok: true,
      message: 'Cron job executed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ 
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 