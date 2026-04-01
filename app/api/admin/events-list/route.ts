import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const events = await prisma.events.findMany({
    orderBy: { event_date: 'asc' }
  });

  return NextResponse.json({ events: JSON.parse(JSON.stringify(events)) });
}
