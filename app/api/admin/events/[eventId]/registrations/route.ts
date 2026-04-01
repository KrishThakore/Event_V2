import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireRole(['admin']);
    const eventId = params.eventId;

    const event = await prisma.events.findUnique({
      where: { id: eventId },
      select: { title: true, event_date: true, start_time: true, end_time: true }
    });

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const registrations = await prisma.registrations.findMany({
      where: { event_id: eventId },
      select: { status: true }
    });

    const stats = {
      total: registrations.length,
      confirmed: registrations.filter((r: any) => r.status === 'CONFIRMED').length,
      pending: registrations.filter((r: any) => r.status === 'PENDING').length,
      cancelled: registrations.filter((r: any) => r.status === 'CANCELLED').length,
    };

    return NextResponse.json({
      event,
      stats,
      ...stats
    });

  } catch (error: any) {
    if (error.message === 'Not authorized' || error.message === 'Not authenticated') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Not authorized' ? 403 : 401 });
    }
    console.error('API admin registrations Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
