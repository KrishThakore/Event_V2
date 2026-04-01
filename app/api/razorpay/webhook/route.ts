import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Razorpay webhook called');
    
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      console.error('❌ No signature in webhook');
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (expected !== signature) {
      console.error('❌ Invalid signature');
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const payment = payload.payload?.payment?.entity;

    if (!payment) {
      console.log('📦 Non-payment event received:', payload.event);
      return NextResponse.json({ success: true, message: "Ignored" });
    }

    // Only process payment.captured or payment.authorized (depending on settings)
    // The original code seemed to process everything that matched the signature.
    // Usually we care about payment.captured.
    if (payload.event !== 'payment.captured') {
      console.log('📦 Ignoring event type:', payload.event);
      return NextResponse.json({ success: true, message: "Non-captured event ignored" });
    }

    const {
      event_id,
      user_id,
      pricing_type,
      pricing_option_id,
    } = payment.notes || {};

    if (!event_id || !user_id) {
      console.warn(`⚠️ Webhook received payment (${payment.id}) for order (${payment.order_id}) without metadata (notes). Confirmed in Razorpay but cannot link to registration. Notes found:`, payment.notes);
      // Return 200 so Razorpay stops retrying. Organizer will need to manually reconcile.
      return NextResponse.json({ success: true, message: "Missing metadata, pending manual reconciliation" });
    }

    // Process registration in a transaction for atomicity and capacity safety
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if registration already exists
      const existing = await tx.registrations.findFirst({
        where: { event_id, user_id }
      });

      if (existing && existing.status === 'CONFIRMED') {
        return { success: true, alreadyProcessed: true, registrationId: existing.id, status: 'CONFIRMED' };
      }

      // 2. Verify Capacity & Event Status
      let finalStatus = 'CONFIRMED';
      
      const events: any[] = await tx.$queryRaw`
        SELECT capacity, status, is_registration_open FROM events WHERE id = ${event_id}::uuid FOR UPDATE
      `;
      const event = events[0];

      if (!event) {
        // This is extremely rare if we have payment notes, but for robustness:
        throw new Error('Event not found in DB during webhook');
      }

      if (event.status !== 'approved' || !event.is_registration_open) {
        finalStatus = 'EVENT_CLOSED';
      } else {
        const count = await tx.registrations.count({
          where: {
            event_id,
            status: { in: ['PENDING', 'CONFIRMED', 'PENDING_VERIFICATION'] }
          }
        });

        if (count >= event.capacity) {
          finalStatus = 'CAPACITY_FULL';
        }
      }

      // 3. Get profile (with fallback)
      const profile = await tx.profiles.findUnique({
        where: { id: user_id }
      });
      
      const userPhone = profile?.phone_number || 'Not Provided';
      const userUni = profile?.university || 'Not Provided';

      // 4. Create or update registration with retry logic for code collision
      let registrationId: string;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          const entryCode = `GAN-${uuidv4().substring(0, 8).toUpperCase()}`;
          
          if (existing) {
            await tx.registrations.update({
              where: { id: existing.id },
              data: {
                status: finalStatus,
                entry_code: finalStatus === 'CONFIRMED' ? entryCode : null,
                pricing_type: pricing_type || existing.pricing_type || 'paid',
                pricing_option_id: pricing_option_id || null,
                paid_amount: payment.amount / 100,
                currency: 'INR'
              }
            });
            registrationId = existing.id;
          } else {
            const registration = await tx.registrations.create({
              data: {
                event_id,
                user_id,
                status: finalStatus,
                phone_number: userPhone,
                university: userUni,
                entry_code: finalStatus === 'CONFIRMED' ? entryCode : null,
                pricing_type: pricing_type || 'paid',
                pricing_option_id: pricing_option_id || null,
                paid_amount: payment.amount / 100,
                currency: 'INR'
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

      // 5. Record payment (Always save if we got here)
      await tx.payments.create({
        data: {
          registration_id: registrationId!,
          razorpay_order_id: payment.order_id,
          razorpay_payment_id: payment.id,
          razorpay_signature: signature,
          amount: payment.amount / 100,
          status: "SUCCESS"
        }
      });

      return { success: true, registrationId: registrationId!, status: finalStatus };
    });

    if (result.alreadyProcessed) {
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    if (result.status !== 'CONFIRMED') {
      console.warn(`🔔 Webhook: Payment captured but ticket ${result.status}:`, result.registrationId);
    } else {
      console.log(`✅ [PAYMENT_SUCCESS] Webhook: Registration ${result.registrationId} confirmed. Razorpay Payment: ${payment.id}`);
    }

    return NextResponse.json({ 
      success: true, 
      registration_id: result.registrationId,
      status: result.status
    });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
