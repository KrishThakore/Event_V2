import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const userRole = session.user.role;
    if (userRole !== 'admin' && userRole !== 'organizer') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { registration_id, action, reason } = body;

    if (!registration_id || !action) {
      return NextResponse.json({ success: false, error: 'Missing registration_id or action' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ success: false, error: 'Action must be "approve" or "reject"' }, { status: 400 });
    }

    if (action === 'reject' && !reason?.trim()) {
      return NextResponse.json({ success: false, error: 'Rejection reason is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Fetch the registration
      const registration = await tx.registrations.findUnique({
        where: { id: registration_id },
        include: {
          event: {
            select: { id: true, title: true, assigned_organizer: true }
          }
        }
      });

      if (!registration) {
        throw new Error('Registration not found');
      }

      // Only allow verification of PENDING_VERIFICATION registrations
      if (registration.status !== 'PENDING_VERIFICATION') {
        throw new Error(`Registration is not pending verification (current: ${registration.status})`);
      }

      // Organizers can only verify their own events
      if (userRole === 'organizer' && registration.event?.assigned_organizer !== session.user.id) {
        throw new Error('You can only verify payments for your events');
      }

      if (action === 'approve') {
        // Generate entry code with retry for uniqueness
        let entryCode = '';
        let attempts = 0;
        while (attempts < 3) {
          try {
            entryCode = `QFX-${uuidv4().substring(0, 8).toUpperCase()}`;
            await tx.registrations.update({
              where: { id: registration_id },
              data: {
                status: 'CONFIRMED',
                entry_code: entryCode,
                verification_status: 'approved',
                verified_by: session.user.id,
                verified_at: new Date(),
              }
            });
            break;
          } catch (err: any) {
            attempts++;
            if (err.code === 'P2002' && attempts < 3) continue;
            throw err;
          }
        }

        // Update the QFIX payment record to SUCCESS
        await tx.payments.updateMany({
          where: { registration_id: registration_id, status: 'PENDING_VERIFICATION' },
          data: { status: 'SUCCESS' }
        });

        return { status: 'CONFIRMED', entry_code: entryCode };
      } else {
        // Reject
        await tx.registrations.update({
          where: { id: registration_id },
          data: {
            status: 'REJECTED',
            verification_status: 'rejected',
            rejection_reason: reason.trim(),
            verified_by: session.user.id,
            verified_at: new Date(),
          }
        });

        // Update the QFIX payment record to FAILED
        await tx.payments.updateMany({
          where: { registration_id: registration_id, status: 'PENDING_VERIFICATION' },
          data: { status: 'FAILED' }
        });

        return { status: 'REJECTED' };
      }
    });

    return NextResponse.json({
      success: true,
      message: action === 'approve'
        ? 'Payment verified and registration confirmed'
        : 'Payment rejected',
      ...result
    });

  } catch (error: any) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed' },
      { status: 400 }
    );
  }
}
