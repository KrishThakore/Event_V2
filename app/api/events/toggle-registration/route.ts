import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !['admin', 'organizer'].includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { eventId, is_registration_open } = await request.json();
  if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });

  await prisma.events.update({ where: { id: eventId }, data: { is_registration_open } });
  return NextResponse.json({ success: true });
}
