import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canManageAttendanceEvent } from '@/lib/attendance-access';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !['organizer', 'scanner'].includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { action, registrationId, entryCode } = body;

  const organizerId = session.user.id;

  try {
    let registration: any = null;

    if (action === 'checkin_by_code' && entryCode) {
      registration = await prisma.registrations.findFirst({
        where: { entry_code: entryCode, status: 'CONFIRMED' }
      });
    } else if (action === 'checkin' && registrationId) {
      registration = await prisma.registrations.findFirst({
        where: { id: registrationId, status: 'CONFIRMED' }
      });
    }

    if (!registration) {
      return NextResponse.json({ error: 'Valid confirmed registration not found' }, { status: 404 });
    }

    const allowed = await canManageAttendanceEvent(organizerId, session.user.role ?? '', registration.event_id);
    if (!allowed) {
      return NextResponse.json({ error: 'You are not authorized to manage attendance for this event' }, { status: 403 });
    }

    try {
      await prisma.attendance.create({
        data: {
          registration_id: registration.id,
          scanned_by_id: organizerId,
          scanned_by_role: session.user.role ?? 'organizer',
        },
      });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError?.code === 'P2002') {
        return NextResponse.json({ error: 'User already checked in' }, { status: 409 });
      }
      throw error;
    }

    await prisma.organizer_logs.create({
      data: {
        organizer_id: organizerId,
        action: 'ATTENDANCE_CHECKIN',
        details: { 
          registration_id: registration.id, 
          event_id: registration.event_id, 
          user_id: registration.user_id, 
          entry_code: registration.entry_code, 
          method: action.replace('checkin_', ''),
          actor_role: session.user.role,
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Organizer Attendance API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
