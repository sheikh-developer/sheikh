import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      message: 'Cron job executed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: 'Error executing cron job',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 