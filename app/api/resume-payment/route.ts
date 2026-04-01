import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { toPaise, RAZORPAY_MIN_AMOUNT } from '@/lib/currency';
import { v4 as uuidv4 } from 'uuid';

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

    // Find the pending registration and ensure it belongs to the user
    const registration = await prisma.registrations.findFirst({
      where: {
        id: registration_id,
        user_id: session.user.id,
        status: 'PENDING'
      },
      include: {
        event: true,
        pricing_option: true
      }
    });

    if (!registration) {
      return NextResponse.json({ 
        success: false, 
        error: 'Pending registration not found or already completed/cancelled.' 
      }, { status: 404 });
    }

    const { event } = registration;

    if (!event || event.status !== 'approved' || !event.is_registration_open) {
      return NextResponse.json({ success: false, error: 'Event registration is closed' }, { status: 400 });
    }

    // Determine the price to charge based on the saved paid_amount or recalculate
    // Primary source is paid_amount which was set during initial registration
    const actualPrice = registration.paid_amount !== null 
      ? Number(registration.paid_amount)
      : (registration.pricing_type === 'custom' && registration.pricing_option 
          ? Number(registration.pricing_option.price) 
          : Number(event.price));

    const amountInPaise = toPaise(actualPrice);

    // Handle events that have become free or were incorrectly marked as pending
    if (amountInPaise === 0) {
      const entryCode = `GAN-${uuidv4().substring(0, 8).toUpperCase()}`;
      await prisma.registrations.update({
        where: { id: registration.id },
        data: {
          status: 'CONFIRMED',
          entry_code: entryCode,
          paid_amount: 0,
          payment_method: 'free'
        }
      });

      return NextResponse.json({
        success: true,
        redirect_to_ticket: true,
        registration_id: registration.id
      });
    }

    // Razorpay minimum amount check (usually 100 paise / ₹1)
    if (amountInPaise < RAZORPAY_MIN_AMOUNT) {
      return NextResponse.json({ 
        success: false, 
        error: `Note: The payment amount (₹${actualPrice}) is below the minimum allowed for online payments (₹1). Please contact the event organizer for assistance.` 
      }, { status: 400 });
    }

    // Re-create the Razorpay order
    const orderPayload = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `r_${registration.id}`,
      notes: {
        event_id: event.id,
        user_id: session.user.id,
        event_title: event.title,
        pricing_type: event.pricing_type,
        ...(event.pricing_type === 'custom' && registration.pricing_option && {
          pricing_option_id: registration.pricing_option.id,
          pricing_option_label: registration.pricing_option.label,
          pricing_option_price: registration.pricing_option.price
        }),
        is_resume: "true",
        registration_id: registration.id,
        site_source: 'university_events_portal'
      },
    };
    
    // Re-create the Razorpay order

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64'),
      },
      body: JSON.stringify(orderPayload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Razorpay API Error on resume:', errorText);
      throw new Error(`Razorpay API Error: ${res.status}`);
    }

    const order = await res.json();

    console.log(`[PAYMENT_RESUME] User ${session.user.id} resuming payment for Reg ${registration.id}. Razorpay Order: ${order.id}`);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      razorpay_key: process.env.RAZORPAY_KEY_ID,
      amount: actualPrice,
      user_id: session.user.id,
      event_title: event.title,
      pricing_type: event.pricing_type,
      selected_pricing_option: registration.pricing_option
    });

  } catch (error: any) {
    console.error('Resume payment failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Payment resumption failed. Please try again.' 
    }, { status: 500 });
  }
}
