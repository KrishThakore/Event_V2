import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

const RAZORPAY_KEY = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET;

async function fetchFromRazorpay(endpoint: string) {
  const auth = Buffer.from(`${RAZORPAY_KEY}:${RAZORPAY_SECRET}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com/v1/${endpoint}`, {
    headers: { 'Authorization': `Basic ${auth}` }
  });
  if (!res.ok) throw new Error(`Razorpay error: ${res.status}`);
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payment_ids, action } = await request.json();
    if (!Array.isArray(payment_ids) || !action) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    const summary = {
      processed: 0,
      errors: 0
    };

    for (const payment_id of payment_ids) {
      try {
        // Fetch payment details from Razorpay
        const payment = await fetchFromRazorpay(`payments/${payment_id}`);
        if (payment.status !== 'captured') {
          console.warn(`Payment ${payment_id} is not captured, skipping.`);
          continue;
        }

        // Extract metadata
        let event_id = payment.notes?.event_id;
        let user_id = payment.notes?.user_id;
        
        if ((!event_id || !user_id) && payment.order_id) {
          const order = await fetchFromRazorpay(`orders/${payment.order_id}`);
          event_id = event_id || order.notes?.event_id;
          user_id = user_id || order.notes?.user_id;
        }

        if (!event_id || !user_id) throw new Error('Missing metadata');

        await prisma.$transaction(async (tx: any) => {
          const registration = await tx.registrations.findFirst({
            where: { event_id, user_id }
          });

          if (!registration) throw new Error('Registration not found');

          if (action === 'confirm') {
            const entryCode = registration.entry_code || `REC-${uuidv4().substring(0, 8).toUpperCase()}`;
            await tx.registrations.update({
              where: { id: registration.id },
              data: {
                status: 'CONFIRMED',
                entry_code: entryCode,
                paid_amount: payment.amount / 100,
                payment_method: 'razorpay'
              }
            });

            const existingCorePayment = await tx.payments.findFirst({
              where: {
                OR: [
                  { razorpay_payment_id: payment.id },
                  ...(payment.order_id ? [{ razorpay_order_id: payment.order_id }] : []),
                ],
              },
            });

            if (!existingCorePayment) {
              await tx.payments.create({
                data: {
                  registration_id: registration.id,
                  razorpay_order_id: payment.order_id,
                  razorpay_payment_id: payment.id,
                  razorpay_signature: 'manual_reconciliation',
                  amount: payment.amount / 100,
                  status: 'SUCCESS'
                }
              });
            }
          } else if (action === 'reject') {
            await tx.registrations.update({
              where: { id: registration.id },
              data: { status: 'REJECTED' }
            });
          }

          await tx.razorpay_sync_hub_records.updateMany({
            where: { razorpay_payment_id: payment.id },
            data: {
              reconciled: true,
              reconciled_at: new Date(),
              registration_id: registration.id,
              event_id,
              user_id,
            },
          });
        });

        summary.processed++;
      } catch (err) {
        summary.errors++;
        console.error(`Error reconciling payment ${payment_id}:`, err);
      }
    }

    return NextResponse.json({ success: true, summary });

  } catch (error: any) {
    console.error('Reconciliation failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Reconciliation failed' }, { status: 500 });
  }
}
