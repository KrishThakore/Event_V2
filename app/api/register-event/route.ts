import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { toPaise, RAZORPAY_MIN_AMOUNT } from '@/lib/currency';
import { getISTDateYYYYMMDD } from '@/lib/date';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const limit = rateLimit(request, user.id);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }

  const eventId = body?.event_id as string | undefined;
  if (!eventId) {
    return NextResponse.json({ success: false, error: 'Missing event_id' }, { status: 400 });
  }

  // Determine payment method from request
  const paymentMethod = body?.payment_method as string | undefined; // 'razorpay' or 'qfix'
  const paymentProofUrl = body?.payment_proof_url as string | undefined;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch event with locking
      const events: any[] = await tx.$queryRaw`
        SELECT * FROM events 
        WHERE id = ${eventId}::uuid 
        FOR UPDATE
      `;

      const event = events[0];

      if (!event) {
        throw new Error('Event not found');
      }

      const todayString = getISTDateYYYYMMDD();
      const eventDateStr = event.event_date ? (typeof event.event_date === 'string' ? event.event_date : event.event_date.toISOString().split('T')[0]) : null;
      const dateAllowsRegistration = eventDateStr ? eventDateStr >= todayString : true;

      if (event.status !== 'approved') {
        throw new Error('Registration closed');
      }

      if (!event.is_registration_open || !dateAllowsRegistration) {
        throw new Error('Registration closed');
      }

      // 2. Validate selected pricing option if custom
      let selectedPricingOption = null;
      let actualPrice = event.price;
      let eventCurrency = event.currency || 'INR';

      // Handle dual-region pricing for ALL event types (paid + custom)
      const selectedRegionCurrency = body?.selected_region_currency as string | undefined; // 'INR' or 'USD'
      
      if (event.use_dual_region_pricing && selectedRegionCurrency) {
        eventCurrency = selectedRegionCurrency;
      }

      if (event.pricing_type === 'custom') {
        const selectedOptionId = body?.selected_pricing_option_id as string | undefined;
        if (!selectedOptionId) {
          throw new Error('Pricing option selection is required for custom pricing events');
        }

        const pricingOption = await tx.event_pricing_options.findUnique({
          where: {
            id: selectedOptionId,
            event_id: eventId
          }
        });

        if (!pricingOption) {
          throw new Error('Invalid pricing option selected');
        }

        selectedPricingOption = pricingOption;
        
        // Handle Dual-Region Pricing selection for custom events
        if (event.use_dual_region_pricing && selectedRegionCurrency) {
          if (selectedRegionCurrency === 'USD') {
            actualPrice = (pricingOption as any).price_usd || pricingOption.price;
            eventCurrency = 'USD';
          } else {
            actualPrice = (pricingOption as any).price_inr || pricingOption.price;
            eventCurrency = 'INR';
          }
        } else {
          actualPrice = pricingOption.price;
          eventCurrency = (pricingOption as any).currency || eventCurrency;
        }
      } else if (event.pricing_type === 'paid' && event.use_dual_region_pricing && selectedRegionCurrency) {
        // Handle Dual-Region Pricing for paid (fixed price) events
        if (selectedRegionCurrency === 'USD') {
          actualPrice = event.price_usd || event.price;
          eventCurrency = 'USD';
        } else {
          actualPrice = event.price_inr || event.price;
          eventCurrency = 'INR';
        }
      }

      // Determine if this is a QFIX/USD payment
      const isQfixPayment = paymentMethod === 'qfix' || eventCurrency === 'USD';

      // Validate QFIX payment requirements
      if (isQfixPayment && !paymentProofUrl) {
        throw new Error('Payment proof is required for QFIX/USD payments');
      }

      // 3. Check for any existing registration for this user/event.
      // Active statuses should still block duplicates, while cancelled/rejected
      // records can be safely reused so users can start over.
      const existingRegistration = await tx.registrations.findFirst({
        where: {
          event_id: eventId,
          user_id: user.id
        }
      });

      if (existingRegistration) {
        if (existingRegistration.status === 'CONFIRMED') {
          throw new Error('Already registered for this event');
        } else if (existingRegistration.status === 'PENDING_VERIFICATION') {
          throw new Error('You have a registration pending verification for this event');
        } else if (existingRegistration.status === 'PENDING') {
          throw new Error('You have a pending registration for this event');
        }
      }

      // 4. Check capacity
      const count = await tx.registrations.count({
        where: {
          event_id: eventId,
          status: { in: ['PENDING', 'CONFIRMED', 'PENDING_VERIFICATION'] }
        }
      });

      if (count >= event.capacity) {
        throw new Error('Event capacity full');
      }

      // 5. Get user profile data
      const profile = await tx.profiles.findUnique({
        where: { id: user.id }
      });

      if (!profile) {
        throw new Error('User profile not found');
      }

      // 6. Create registration
      const isFree = Number(actualPrice) === 0;
      
      let registrationStatus: string;
      if (isFree) {
        registrationStatus = 'CONFIRMED';
      } else if (isQfixPayment) {
        registrationStatus = 'PENDING_VERIFICATION';
      } else {
        registrationStatus = 'PENDING';
      }

      const registrationPayload = {
        status: registrationStatus,
        phone_number: profile.phone_number,
        university: profile.university,
        entry_code: isFree ? `GAN-${uuidv4().substring(0, 8).toUpperCase()}` : null,
        pricing_type: event.pricing_type,
        pricing_option_id: selectedPricingOption?.id || null,
        paid_amount: isFree ? 0 : actualPrice,
        currency: eventCurrency,
        payment_method: isQfixPayment ? 'qfix' : (isFree ? 'free' : 'razorpay'),
        payment_proof_url: isQfixPayment ? paymentProofUrl : null,
        verification_status: isQfixPayment ? 'pending' : null,
        rejection_reason: null,
        verified_by: null,
        verified_at: null,
      };

      let registration;

      if (existingRegistration && ['CANCELLED', 'REJECTED'].includes(existingRegistration.status)) {
        await tx.registration_responses.deleteMany({
          where: { registration_id: existingRegistration.id }
        });

        registration = await (tx.registrations as any).update({
          where: { id: existingRegistration.id },
          data: {
            ...registrationPayload,
            responses: {
              create: (body.answers || []).map((ans: any) => ({
                field_id: ans.field_id,
                value: ans.value
              }))
            }
          },
          include: {
            event: { select: { id: true, title: true, is_paid: true, price: true, currency: true } } as any,
            user: { select: { id: true, full_name: true, email: true, phone_number: true, university: true } } as any
          }
        } as any);
      } else {
        registration = await (tx.registrations as any).create({
          data: {
            event_id: eventId,
            user_id: user.id,
            ...registrationPayload,
            responses: {
              create: (body.answers || []).map((ans: any) => ({
                field_id: ans.field_id,
                value: ans.value
              }))
            }
          },
          include: {
            event: { select: { id: true, title: true, is_paid: true, price: true, currency: true } } as any,
            user: { select: { id: true, full_name: true, email: true, phone_number: true, university: true } } as any
          }
        } as any);
      }

      if (isFree) {
        return { success: true, free: true, registration_id: registration.id };
      }

      if (isQfixPayment) {
        // Create a payment record for QFIX payments too (for unified reporting)
        await tx.payments.create({
          data: {
            registration_id: registration.id,
            amount: actualPrice,
            status: 'PENDING_VERIFICATION',
            razorpay_order_id: null,
            razorpay_payment_id: null,
            razorpay_signature: null,
          }
        } as any);

        return {
          success: true,
          free: false,
          qfix: true,
          pending_verification: true,
          registration_id: registration.id,
          message: 'Payment proof submitted. Your registration is pending verification by the organizer.'
        };
      }

      // 7. If PAID via Razorpay, return data to create Razorpay order
      return {
        success: true,
        free: false,
        qfix: false,
        event: {
          id: event.id,
          title: event.title,
          price: actualPrice,
          pricing_type: event.pricing_type,
          currency: event.currency
        },
        selectedPricingOption,
        profile,
        registrationId: registration.id
      };
    });

    if (result.free || result.qfix || !result.event) {
      return NextResponse.json(result);
    }

    // PAID EVENT (INR/Razorpay) - Create Razorpay order
    const actualPrice = Number(result.event.price);
    const amountInPaise = toPaise(actualPrice);
    const registrationId = result.registrationId; // Get registrationId from result

    if (amountInPaise > 0 && amountInPaise < RAZORPAY_MIN_AMOUNT) {
      throw new Error(`Order amount (₹${actualPrice}) is below the minimum allowed for online payments (₹1). Please contact the organizer.`);
    }

    const orderOptions = {
      amount: amountInPaise,
      currency: (result.event as any).currency === 'USD' ? 'USD' : 'INR', // Dynamic currency based on event
      receipt: `r_${result.registrationId}`, // Use shorter prefix to fit 40-char limit
      notes: {
        registration_id: result.registrationId,
        event_id: (result.event as any).id,
        user_id: result.profile.id,
        site_source: 'university_events_portal', // Added site_source
        event_title: (result.event as any).title, // Keep existing notes
        pricing_type: (result.event as any).pricing_type, // Keep existing notes
        ...(result.event.pricing_type === 'custom' && { // Keep existing notes
          pricing_option_id: result.selectedPricingOption?.id,
          pricing_option_label: result.selectedPricingOption?.label,
          pricing_option_price: result.selectedPricingOption?.price
        })
      },
    };
    
    // Create Razorpay order

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64'),
      },
      body: JSON.stringify(orderOptions),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Razorpay API Error:', errorText);
      throw new Error(`Razorpay API Error: ${res.status}`);
    }

    const order = await res.json();

    console.log(`[PAYMENT_START] User ${user.id} starting payment for Event ${eventId}. Razorpay Order: ${order.id}`);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      razorpay_key: process.env.RAZORPAY_KEY_ID,
      amount: actualPrice,
      user_id: user.id,
      event_title: result.event.title,
      pricing_type: result.event.pricing_type,
      selected_pricing_option: result.selectedPricingOption
    });

  } catch (error: any) {
    console.error('Registration failed:', error);

    let errorMessage = 'Registration failed';
    let statusCode = 400;

    if (error.message.includes('Event not found')) {
      errorMessage = 'This event is no longer available';
      statusCode = 404;
    } else if (error.message.includes('Already registered')) {
      errorMessage = 'You are already registered for this event';
      statusCode = 409;
    } else if (error.message.includes('pending verification')) {
      errorMessage = 'You have a registration pending verification for this event';
      statusCode = 409;
    } else if (error.message.includes('capacity')) {
      errorMessage = 'This event has reached maximum capacity';
      statusCode = 409;
    } else if (error.message.includes('Razorpay')) {
      errorMessage = 'Payment service unavailable. Please try again.';
      statusCode = 503;
    } else if (error.message.includes('Payment proof')) {
      errorMessage = error.message;
      statusCode = 400;
    }

    return NextResponse.json({ success: false, error: errorMessage, details: error.message }, { status: statusCode });
  }
}
