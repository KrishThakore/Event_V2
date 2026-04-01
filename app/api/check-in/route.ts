import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const limit = rateLimit(request, session.user.id);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }

  try {
    // Handle preview action
    if (body.action === 'preview') {
      const { text, eventId } = body;

      let registration_id: string | undefined;

      try {
        const { verifyToken } = await import('@/lib/qr');
        const verification = verifyToken(text);
        if (verification.valid) {
          registration_id = verification.payload.registration_id;
        } else {
          const parsed = JSON.parse(atob(text));
          registration_id = parsed.registration_id;
        }
      } catch {
        registration_id = text;
      }

      const registration = await prisma.registrations.findUnique({
        where: { id: registration_id },
        include: {
          user: { select: { id: true, full_name: true, email: true } },
          event: { select: { id: true, title: true } }
        }
      });

      if (!registration) {
        return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
      }

      if (eventId && registration.event_id !== eventId) {
        return NextResponse.json({ success: false, error: 'Registration does not match this event' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        registrationId: registration.id,
        user: registration.user,
        event: registration.event,
        registrationStatus: registration.status
      });
    }

    // Handle confirm action
    if (body.action === 'confirm') {
      const { registrationId } = body;

      const registration = await prisma.registrations.findUnique({
        where: { id: registrationId },
        select: { id: true, status: true, entry_code: true, event_id: true }
      });

      if (!registration) {
        return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
      }
      if (registration.status !== 'CONFIRMED') {
        return NextResponse.json({ success: false, error: 'Registration not confirmed' }, { status: 400 });
      }

      try {
        await prisma.attendance.create({
          data: {
            registration_id: registrationId,
            scanned_by_id: session.user.id,
            scanned_by_role: session.user.role ?? 'unknown',
          }
        });
      } catch (error: unknown) {
        const prismaError = error as { code?: string };
        if (prismaError?.code === 'P2002') {
          return NextResponse.json({ success: false, error: 'Already checked in' }, { status: 409 });
        }
        throw error;
      }

      return NextResponse.json({ success: true, registrationId });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });

  } catch (error: any) {
    console.error('check-in failed', error);
    return NextResponse.json({ success: false, error: error.message || 'Check-in failed' }, { status: 400 });
  }
}
