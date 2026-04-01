import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canManageAttendanceEvent } from '@/lib/attendance-access';

type SessionRole = 'admin' | 'organizer' | 'scanner' | string;
type ScanLookupRegistration = {
  id: string;
  status: string;
  entry_code: string | null;
  event_id: string | null;
  user_id: string | null;
  created_at: Date | null;
  user?: {
    id: string;
    full_name: string;
    email: string | null;
    phone_number: string | null;
    university: string | null;
  } | null;
  event?: {
    id: string;
    title: string;
  } | null;
};

const scanLookupSelect = {
  id: true,
  status: true,
  entry_code: true,
  event_id: true,
  user_id: true,
  created_at: true,
  user: {
    select: {
      id: true,
      full_name: true,
      email: true,
      phone_number: true,
      university: true,
    },
  },
  event: {
    select: {
      id: true,
      title: true,
    },
  },
} as const;

async function findRegistration(text: string, includeRelations = false): Promise<ScanLookupRegistration | null> {
  const trimmedText = (text ?? '').trim();
  if (!trimmedText) return null;

  const select = includeRelations
    ? scanLookupSelect
    : {
        id: true,
        status: true,
        entry_code: true,
        event_id: true,
        user_id: true,
        created_at: true,
      };

  try {
    const { verifyToken } = await import('@/lib/qr');
    const verification = verifyToken(trimmedText);
    if (verification.valid && verification.payload?.registration_id) {
      const bySignedToken = await prisma.registrations.findUnique({
        where: { id: verification.payload.registration_id as string },
        select,
      });
      if (bySignedToken) return bySignedToken;
    }
  } catch {
    // Fall through to the next lookup strategy.
  }

  if (trimmedText.startsWith('{') && trimmedText.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmedText);
      if (parsed.registration_id) {
        const byJson = await prisma.registrations.findUnique({
          where: { id: parsed.registration_id },
          select,
        });
        if (byJson) return byJson;
      }
    } catch {
      // Fall through to the next lookup strategy.
    }
  }

  const byEntryCode = await prisma.registrations.findFirst({
    where: { entry_code: trimmedText },
    select,
  });
  if (byEntryCode) return byEntryCode;

  try {
    const byRegistrationId = await prisma.registrations.findUnique({
      where: { id: trimmedText },
      select,
    });
    if (byRegistrationId) return byRegistrationId;
  } catch {
    // Ignore invalid UUID input and finish with null.
  }

  return null;
}

async function assertAuthorized(role: SessionRole, userId: string, eventId: string | null) {
  if (role === 'admin') return;
  if (!eventId) {
    throw new Error('Registration is not linked to an event');
  }

  const allowed = await canManageAttendanceEvent(userId, role, eventId);
  if (!allowed) {
    throw new Error('Not authorized for this registration');
  }
}

async function getRegistrationDetails(registrationId: string) {
  return prisma.registrations.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      status: true,
      entry_code: true,
      event_id: true,
      user_id: true,
      user: {
        select: {
          id: true,
          full_name: true,
          email: true,
          phone_number: true,
          university: true,
        },
      },
      event: {
        select: {
          id: true,
          title: true,
        },
      },
      attendance: {
        select: {
          id: true,
          checked_in_at: true,
          scanned_by_id: true,
          scanned_by_role: true,
          scanned_by_profile: {
            select: {
              full_name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

async function writeCheckinLog(role: SessionRole, userId: string, registration: {
  id: string;
  event_id: string | null;
  user_id: string | null;
}) {
  const details = {
    registration_id: registration.id,
    event_id: registration.event_id,
    user_id: registration.user_id,
    method: 'qr',
    actor_role: role,
  };

  if (role === 'organizer' || role === 'scanner') {
    await prisma.organizer_logs.create({
      data: {
        organizer_id: userId,
        action: 'ATTENDANCE_CHECKIN',
        details,
      },
    });
    return;
  }

  await prisma.admin_logs.create({
    data: {
      admin_id: userId,
      action: 'ATTENDANCE_CHECKIN',
      details,
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action as 'preview' | 'confirm' | 'scan' | undefined;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  const userId = session.user.id;
  const role = session.user.role as SessionRole;

  if (action === 'preview') {
    const text = body.text as string | undefined;
    const eventId = body.eventId as string | undefined;
    if (!text) {
      return NextResponse.json({ message: 'Missing scan data' }, { status: 400 });
    }

    const registration = await findRegistration(text);
    if (!registration) {
      return NextResponse.json({ message: 'Registration not found for scanned code' }, { status: 404 });
    }

    if (eventId && registration.event_id !== eventId) {
      return NextResponse.json({ message: 'Scanned registration does not belong to the selected event' }, { status: 400 });
    }

    try {
      await assertAuthorized(role, userId, registration.event_id ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Not authorized for this registration';
      return NextResponse.json({ message }, { status: 403 });
    }

    const details = await getRegistrationDetails(registration.id);
    if (!details) {
      return NextResponse.json({ message: 'Registration not found' }, { status: 404 });
    }

    return NextResponse.json({
      registrationId: details.id,
      registrationStatus: details.status,
      entryCode: details.entry_code,
      event: details.event,
      user: details.user,
      alreadyCheckedIn: !!details.attendance,
    });
  }

  if (action === 'confirm') {
    const registrationId = body.registrationId as string | undefined;
    if (!registrationId) {
      return NextResponse.json({ message: 'Missing registrationId' }, { status: 400 });
    }

    const registration = await prisma.registrations.findUnique({
      where: { id: registrationId },
      select: { id: true, status: true, event_id: true, user_id: true },
    });
    if (!registration) {
      return NextResponse.json({ message: 'Registration not found' }, { status: 404 });
    }
    if (registration.status !== 'CONFIRMED') {
      return NextResponse.json({ message: 'Registration not confirmed' }, { status: 400 });
    }

    try {
      await assertAuthorized(role, userId, registration.event_id ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Not authorized for this registration';
      return NextResponse.json({ message }, { status: 403 });
    }

    const existing = await prisma.attendance.findUnique({
      where: { registration_id: registration.id },
    });
    if (existing) {
      return NextResponse.json({ message: 'Already checked in' }, { status: 409 });
    }

    await prisma.attendance.create({
      data: {
        registration_id: registration.id,
        scanned_by_id: userId,
        scanned_by_role: role,
      },
    });

    await writeCheckinLog(role, userId, registration);

    const details = await getRegistrationDetails(registration.id);
    return NextResponse.json({
      success: true,
      registrationId: registration.id,
      user: details?.user ?? null,
      event: details?.event ?? null,
    });
  }

  if (action === 'scan') {
    const text = body.text as string | undefined;
    const eventId = body.eventId as string | undefined;
    if (!text) {
      return NextResponse.json({ message: 'Missing scan data' }, { status: 400 });
    }

    const registration = await findRegistration(text, true);
    if (!registration) {
      return NextResponse.json({ message: 'Registration not found for scanned code' }, { status: 404 });
    }
    if (registration.status !== 'CONFIRMED') {
      return NextResponse.json({ message: 'Registration not confirmed' }, { status: 400 });
    }
    if (eventId && registration.event_id !== eventId) {
      return NextResponse.json({ message: 'Scanned registration does not belong to the selected event' }, { status: 400 });
    }

    try {
      await assertAuthorized(role, userId, registration.event_id ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Not authorized for this registration';
      return NextResponse.json({ message }, { status: 403 });
    }

    let status: 'checked_in' | 'already_checked_in' = 'checked_in';
    let checkedInAt: Date | null = null;
    try {
      await prisma.attendance.create({
        data: {
          registration_id: registration.id,
          scanned_by_id: userId,
          scanned_by_role: role,
        },
      });
      checkedInAt = new Date();
      void writeCheckinLog(role, userId, registration).catch(() => {
        // Keep the scan response path fast even if logging fails.
      });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError?.code === 'P2002') {
        status = 'already_checked_in';
        const existingAttendance = await prisma.attendance.findUnique({
          where: { registration_id: registration.id },
          select: {
            checked_in_at: true,
            scanned_by_id: true,
            scanned_by_role: true,
            scanned_by_profile: {
              select: {
                full_name: true,
                email: true,
              },
            },
          },
        });
        checkedInAt = existingAttendance?.checked_in_at ?? null;
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      status,
      registrationId: registration.id,
      entryCode: registration.entry_code,
      user: registration.user ?? null,
      event: registration.event ?? null,
      checkedInAt,
    });
  }

  return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
}
