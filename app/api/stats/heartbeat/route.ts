import { NextRequest, NextResponse } from 'next/server';
import { liveStatsManager } from '@/lib/live-stats';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, type } = await request.json();
    
    if (!sessionId || !type) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    liveStatsManager.heartbeat(sessionId, type);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
