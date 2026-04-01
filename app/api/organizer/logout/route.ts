import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !['organizer', 'scanner'].includes(session.user.role ?? '')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Log the organizer logout action (best effort)
    try {
      await (prisma as any).organizer_logs.create({
        data: {
          organizer_id: session.user.id,
          action: 'ORGANIZER_LOGOUT',
          details: {
            timestamp: new Date().toISOString(),
            user_agent: request.headers.get('user-agent') || 'unknown',
            actor_role: session.user.role,
          }
        }
      });
    } catch {
      // Skip if organizer_logs table doesn't exist
    }

    // Supabase auth state is cleared client-side; this endpoint only records the logout event.
    return NextResponse.json({ success: true, message: 'Logged out successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('API organizer logout Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
