import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { registration_id } = await request.json();

    if (!registration_id) {
      return NextResponse.json({ success: false, error: 'Missing registration_id' }, { status: 400 });
    }

    // Verify ownership and PENDING status
    const registration = await prisma.registrations.findFirst({
      where: {
        id: registration_id,
        user_id: session.user.id,
        status: 'PENDING'
      }
    });

    if (!registration) {
      return NextResponse.json({ 
        success: false, 
        error: 'Pending registration not found or already completed/cancelled.' 
      }, { status: 404 });
    }

    // Mark the registration as cancelled instead of deleting it.
    // This preserves the audit trail while still allowing the user to start over.
    await prisma.registrations.update({
      where: { id: registration.id },
      data: {
        status: 'CANCELLED',
        entry_code: null,
        payment_method: null,
        payment_proof_url: null,
        verification_status: null,
        rejection_reason: null,
        verified_by: null,
        verified_at: null,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Pending registration cancelled successfully. You can now start over.'
    });

  } catch (error: any) {
    console.error('Cancel pending registration failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to cancel registration. Please try again.' 
    }, { status: 500 });
  }
}
