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
  if (!res.ok) {
    const error = await res.text();
    console.error(`Razorpay API error (${endpoint}):`, error);
    throw new Error(`Razorpay error: ${res.status}`);
  }
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!RAZORPAY_KEY || !RAZORPAY_SECRET) {
      return NextResponse.json({ success: false, error: 'Razorpay keys not configured' }, { status: 500 });
    }

    // 1. Fetch recent captured payments (default count is 10, let's get 50 to be thorough)
    const paymentsData = await fetchFromRazorpay('payments?count=50');
    const payments = paymentsData.items || [];
    
    const summary = {
      total_checked: payments.length,
      already_recorded: 0,
      reconciled: 0,
      failed_metadata: 0,
      errors: 0
    };

    for (const payment of payments) {
      try {
        // 2. Save/Update in the isolated Sync Hub table (Store EVERYTHING)
        const syncRecord = await prisma.razorpay_sync_hub_records.upsert({
          where: { razorpay_payment_id: payment.id },
          update: {
            status: payment.status,
            amount: payment.amount / 100,
            fee: payment.fee ? payment.fee / 100 : null,
            tax: payment.tax ? payment.tax / 100 : null,
            error_code: payment.error_code,
            error_description: payment.error_description,
            acquirer_data: payment.acquirer_data || {},
            raw_response: payment // Store the full latest JSON
          },
          create: {
            razorpay_payment_id: payment.id,
            razorpay_order_id: payment.order_id,
            amount: payment.amount / 100,
            currency: payment.currency,
            status: payment.status,
            method: payment.method,
            description: payment.description,
            email: payment.email,
            contact: payment.contact,
            notes: payment.notes || {},
            fee: payment.fee ? payment.fee / 100 : null,
            tax: payment.tax ? payment.tax / 100 : null,
            error_code: payment.error_code,
            error_description: payment.error_description,
            acquirer_data: payment.acquirer_data || {},
            vpa: payment.vpa,
            card_id: payment.card_id,
            bank: payment.bank,
            wallet: payment.wallet,
            razorpay_created_at: new Date(payment.created_at * 1000),
            raw_response: payment,
            event_id: payment.notes?.event_id,
            user_id: payment.notes?.user_id
          }
        });

        // 3. Reconcile captured payments if not already recorded in the core payments table
        if (payment.status !== 'captured') continue;

        const existingPayment = await prisma.payments.findUnique({
          where: { razorpay_payment_id: payment.id }
        });

        if (existingPayment) {
          summary.already_recorded++;
          continue;
        }

        // 4. Extract metadata (notes)
        let event_id = payment.notes?.event_id;
        let user_id = payment.notes?.user_id;

        // 5. Fallback: If notes are missing on payment, fetch the Order
        if ((!event_id || !user_id) && payment.order_id) {
          try {
            const orderData = await fetchFromRazorpay(`orders/${payment.order_id}`);
            event_id = event_id || orderData.notes?.event_id;
            user_id = user_id || orderData.notes?.user_id;
            
            // Update the sync record with the found metadata
            await prisma.razorpay_sync_hub_records.update({
              where: { id: syncRecord.id },
              data: { event_id, user_id }
            });
          } catch (e) {
            console.error(`Failed to fetch order ${payment.order_id} for reconciliation:`, e);
          }
        }

        if (!event_id || !user_id) {
          summary.failed_metadata++;
          console.warn(`Could not find metadata for payment ${payment.id}`);
          continue;
        }

        // 6. Reconcile: Update registration and create core payment record
        await prisma.$transaction(async (tx: any) => {
          // Find registration
          const registration = await tx.registrations.findFirst({
            where: { event_id, user_id, status: 'PENDING' }
          });

          if (!registration) {
            // Check if already confirmed (maybe by frontend handler)
            const confirmedReg = await tx.registrations.findFirst({
              where: { event_id, user_id, status: 'CONFIRMED' }
            });
            
            if (confirmedReg) {
              // Create the core payment record if missing
              await tx.payments.create({
                data: {
                  registration_id: confirmedReg.id,
                  razorpay_order_id: payment.order_id,
                  razorpay_payment_id: payment.id,
                  razorpay_signature: 'reconciled_sync_hub',
                  amount: payment.amount / 100,
                  status: 'SUCCESS'
                }
              });

              // Mark sync record as reconciled
              await tx.razorpay_sync_hub_records.update({
                where: { id: syncRecord.id },
                data: { reconciled: true, reconciled_at: new Date(), registration_id: confirmedReg.id }
              });

              summary.reconciled++;
              return;
            }
            
            throw new Error('No pending or confirmed registration found for this metadata');
          }

          // Generate entry code if missing
          const entryCode = registration.entry_code || `REC-${uuidv4().substring(0, 8).toUpperCase()}`;

          // Update registration
          await tx.registrations.update({
            where: { id: registration.id },
            data: {
              status: 'CONFIRMED',
              entry_code: entryCode,
              paid_amount: payment.amount / 100,
              payment_method: 'razorpay'
            }
          });

          // Create core payment record
          await tx.payments.create({
            data: {
              registration_id: registration.id,
              razorpay_order_id: payment.order_id,
              razorpay_payment_id: payment.id,
              razorpay_signature: 'reconciled_sync_hub',
              amount: payment.amount / 100,
              status: 'SUCCESS'
            }
          });

          // Mark sync record as reconciled
          await tx.razorpay_sync_hub_records.update({
            where: { id: syncRecord.id },
            data: { reconciled: true, reconciled_at: new Date(), registration_id: registration.id }
          });

          summary.reconciled++;
        });

      } catch (err) {
        summary.errors++;
        console.error(`Error reconciling payment ${payment.id}:`, err);
      }
    }

    return NextResponse.json({ success: true, summary });

  } catch (error: any) {
    console.error('Razorpay sync failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Sync failed' }, { status: 500 });
  }
}
