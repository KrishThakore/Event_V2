import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { registrationId } = await request.json();

    if (!registrationId) {
      return NextResponse.json({ error: 'Missing registrationId' }, { status: 400 });
    }

    // Find the registration and verify it belongs to this user
    const registration = await prisma.registrations.findFirst({
      where: {
        id: registrationId,
        user_id: session.user.id,
      },
      select: { id: true, status: true }
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (registration.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Registration is already cancelled' }, { status: 400 });
    }

    // PENDING registrations: delete entirely so dashboard stays clean
    // CONFIRMED registrations: mark as CANCELLED (preserve record for organiser)
    if (registration.status === 'PENDING') {
      await prisma.registrations.delete({ where: { id: registration.id } });
    } else {
      await prisma.registrations.update({
        where: { id: registration.id },
        data: { status: 'CANCELLED' }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Cancel registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel registration' },
      { status: 500 }
    );
  }
}
