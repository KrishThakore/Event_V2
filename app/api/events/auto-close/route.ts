import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = await prisma.events.findMany({
    where: { is_registration_open: true, event_date: { lt: today } },
    select: { id: true }
  });

  if (events.length === 0) return NextResponse.json({ closedIds: [] });

  const ids = events.map(e => e.id);
  await prisma.events.updateMany({ where: { id: { in: ids } }, data: { is_registration_open: false } });

  return NextResponse.json({ closedIds: ids });
}
