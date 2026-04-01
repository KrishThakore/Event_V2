import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Manual payment confirmation called');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { event_id, payment_id, order_id, amount, pricing_type, pricing_option_id } = body;

    if (!event_id || !payment_id || !order_id) {
      return NextResponse.json({ success: false, error: 'Missing required fields: event_id, payment_id, order_id' }, { status: 400 });
    }

    // 1. Fetch user profile to get required registration data (with fallback)
    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: { phone_number: true, university: true }
    });

    const userPhone = profile?.phone_number || 'Not Provided';
    const userUni = profile?.university || 'Not Provided';

    // 2. Process everything in a transaction for atomicity and capacity safety
    const result = await prisma.$transaction(async (tx: any) => {
      // a. Check if registration already exists
      const existing = await tx.registrations.findFirst({
        where: { event_id, user_id: userId }
      });

      if (existing && existing.status === 'CONFIRMED') {
        return { alreadyExists: true, id: existing.id, status: 'CONFIRMED' };
      }

      // b. Verify Capacity & Event Status
      let finalStatus = 'CONFIRMED';
      
      const events: any[] = await tx.$queryRaw`
        SELECT capacity, status, is_registration_open FROM events WHERE id = ${event_id}::uuid FOR UPDATE
      `;
      const event = events[0];
      if (!event) throw new Error('Event not found');

      if (event.status !== 'approved' || !event.is_registration_open) {
        finalStatus = 'EVENT_CLOSED';
      } else {
        const count = await tx.registrations.count({
          where: { event_id, status: { in: ['PENDING', 'CONFIRMED'] } }
        });
        if (count >= event.capacity) {
          finalStatus = 'CAPACITY_FULL';
        }
      }

      // c. Create or update registration with retry logic for code collision
      let registrationId: string;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          const entryCode = `MAN-${uuidv4().split('-')[0].toUpperCase()}`;
          
          if (existing) {
            await tx.registrations.update({
              where: { id: existing.id },
              data: {
                status: finalStatus,
                entry_code: finalStatus === 'CONFIRMED' ? entryCode : null,
                paid_amount: amount / 100,
                pricing_type: pricing_type || existing.pricing_type || 'paid',
                pricing_option_id: pricing_option_id || existing.pricing_option_id || null,
              }
            });
            registrationId = existing.id;
          } else {
            const registration = await tx.registrations.create({
              data: {
                user_id: userId,
                event_id,
                status: finalStatus,
                entry_code: finalStatus === 'CONFIRMED' ? entryCode : null,
                phone_number: userPhone,
                university: userUni,
                pricing_type: pricing_type || 'paid',
                pricing_option_id: pricing_option_id || null,
                paid_amount: amount / 100,
                responses: {
                  create: (body.answers || []).map((ans: any) => ({
                    field_id: ans.field_id,
                    value: ans.value
                  }))
                }
              }
            });
            registrationId = registration.id;
          }
          break; // Success
        } catch (err: any) {
          attempts++;
          if (err.code === 'P2002' && attempts < maxAttempts) {
            continue; // Retry with new code
          }
          throw err;
        }
      }

      // d. Record payment (Always save if we got here)
      await tx.payments.create({
        data: {
          registration_id: registrationId!,
          razorpay_order_id: order_id,
          razorpay_payment_id: payment_id,
          razorpay_signature: 'manual_client_confirmation',
          amount: amount / 100,
          status: 'SUCCESS'
        }
      });

      return { alreadyExists: false, id: registrationId!, status: finalStatus };
    });

    if (result.alreadyExists) {
      return NextResponse.json({ success: true, message: 'Registration already exists', registration_id: result.id });
    }

    if (result.status !== 'CONFIRMED') {
      console.warn(`⚠️ Payment successful but ticket ${result.status}:`, result.id);
      return NextResponse.json({ 
        success: true, 
        message: `Payment received but ${result.status.replace('_', ' ')}. Organizer will contact you.`, 
        registration_id: result.id,
        warning: result.status
      });
    }

    console.log('✅ Registration confirmed successfully:', result.id);
    return NextResponse.json({ success: true, message: 'Payment confirmed and registration created', registration_id: result.id });

    if (result.alreadyExists) {
      return NextResponse.json({ success: true, message: 'Registration already exists', registration_id: result.id });
    }

    console.log('✅ Registration confirmed successfully:', result.id);
    return NextResponse.json({ success: true, message: 'Payment confirmed and registration created', registration_id: result.id });
  } catch (error: any) {
    console.error('❌ Manual confirmation failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Manual confirmation failed' }, { status: 500 });
  }
}
