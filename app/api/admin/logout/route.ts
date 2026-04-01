import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['admin']);

    // Log the logout action for tracking
    await prisma.admin_logs.create({
      data: {
        admin_id: user.id,
        action: 'ADMIN_LOGOUT',
        details: {
          user_agent: request.headers.get('user-agent') || 'unknown'
        }
      }
    });

    // Note: Actual session clearing happens on the client via NextAuth signOut()
    return NextResponse.json({ success: true, message: 'Logout logged' }, { status: 200 });

  } catch (error: any) {
    if (error.message === 'Not authorized' || error.message === 'Not authenticated') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Not authorized' ? 403 : 401 });
    }
    console.error('API admin logout Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
