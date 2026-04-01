import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const maxDuration = 300;

const RAZORPAY_KEY = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const ALLOWED_SCAN_LIMITS = [100, 300, 500, 1000, 2000, 5000, 10000, 50000];
const PAGE_SIZE = 100;
const MAX_SCAN_CHUNK = 200;
const PENDING_REGISTRATION_STATUSES = ['PENDING', 'PENDING_VERIFICATION'] as const;
const PROCESSING_BATCH_SIZE = 10;

async function fetchFromRazorpay(endpoint: string) {
  const auth = Buffer.from(`${RAZORPAY_KEY}:${RAZORPAY_SECRET}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com/v1/${endpoint}`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`Razorpay API error (${endpoint}):`, error);
    throw new Error(`Razorpay error: ${res.status}`);
  }

  return res.json();
}

function normalizeScanLimit(limit: unknown) {
  const parsed = Number(limit);
  if (Number.isFinite(parsed) && ALLOWED_SCAN_LIMITS.includes(parsed)) {
    return parsed;
  }
  return 300;
}

function isCapturedPayment(payment: any) {
  return payment?.status === 'captured';
}

function isOurPortalSource(siteSource: unknown) {
  return !siteSource || siteSource === 'university_events_portal';
}

function getCompositeKey(eventId?: string | null, userId?: string | null) {
  return eventId && userId ? `${eventId}:${userId}` : null;
}

function resolvePhoneNumber(registration: any, record: any) {
  return (
    registration?.phone_number ||
    registration?.user?.phone_number ||
    record.contact ||
    record.raw_response?.contact ||
    ''
  );
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return null;
  }
  return session;
}

function extractTransactionDetails(record: any) {
  const raw = (record.raw_response ?? {}) as any;
  const acquirer = (record.acquirer_data ?? raw.acquirer_data ?? {}) as any;

  return {
    vpa: record.vpa ?? raw.vpa ?? undefined,
    upi_rrn: acquirer.rrn ?? acquirer.upi_transaction_id ?? undefined,
    bank_tid: acquirer.bank_transaction_id ?? undefined,
    bank: record.bank ?? raw.bank ?? undefined,
    wallet: record.wallet ?? raw.wallet ?? undefined,
  };
}

async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  worker: (item: T, index: number) => Promise<R>
) {
  const results: R[] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, batchIndex) => worker(item, index + batchIndex))
    );
    results.push(...batchResults);
  }

  return results;
}

async function validatePersistedRecords() {
  const records = await prisma.razorpay_sync_hub_records.findMany({
    where: { reconciled: false },
    orderBy: { razorpay_created_at: 'desc' },
  });

  if (records.length === 0) {
    return { validatedCount: 0, removedCount: 0 };
  }

  const orderCache = new Map<string, any>();
  let removedCount = 0;

  for (const record of records) {
    try {
      const latestPayment = await fetchFromRazorpay(`payments/${record.razorpay_payment_id}`);

      const updateData: any = {
        razorpay_order_id: latestPayment.order_id,
        amount: latestPayment.amount / 100,
        currency: latestPayment.currency,
        status: latestPayment.status,
        method: latestPayment.method,
        description: latestPayment.description,
        email: latestPayment.email,
        contact: latestPayment.contact,
        notes: latestPayment.notes || {},
        fee: latestPayment.fee ? latestPayment.fee / 100 : null,
        tax: latestPayment.tax ? latestPayment.tax / 100 : null,
        error_code: latestPayment.error_code,
        error_description: latestPayment.error_description,
        acquirer_data: latestPayment.acquirer_data || {},
        vpa: latestPayment.vpa,
        card_id: latestPayment.card_id,
        bank: latestPayment.bank,
        wallet: latestPayment.wallet,
        razorpay_created_at: new Date(latestPayment.created_at * 1000),
        raw_response: latestPayment,
      };

      if (!isCapturedPayment(latestPayment)) {
        await prisma.razorpay_sync_hub_records.update({
          where: { id: record.id },
          data: {
            ...updateData,
            reconciled: true,
            reconciled_at: new Date(),
          },
        });
        removedCount++;
        continue;
      }

      const existingCorePayment = await prisma.payments.findFirst({
        where: {
          OR: [
            { razorpay_payment_id: latestPayment.id },
            ...(latestPayment.order_id ? [{ razorpay_order_id: latestPayment.order_id }] : []),
          ],
        },
        select: { registration_id: true },
      });

      if (existingCorePayment) {
        await prisma.razorpay_sync_hub_records.update({
          where: { id: record.id },
          data: {
            ...updateData,
            registration_id: existingCorePayment.registration_id ?? null,
            reconciled: true,
            reconciled_at: new Date(),
          },
        });
        removedCount++;
        continue;
      }

      let event_id = latestPayment.notes?.event_id ?? record.event_id;
      let user_id = latestPayment.notes?.user_id ?? record.user_id;
      let site_source = latestPayment.notes?.site_source;
      let mergedNotes = latestPayment.notes || {};

      if ((!event_id || !user_id || !site_source) && latestPayment.order_id) {
        try {
          let orderData = orderCache.get(latestPayment.order_id);
          if (!orderData) {
            orderData = await fetchFromRazorpay(`orders/${latestPayment.order_id}`);
            orderCache.set(latestPayment.order_id, orderData);
          }

          event_id = event_id || orderData.notes?.event_id;
          user_id = user_id || orderData.notes?.user_id;
          site_source = site_source || orderData.notes?.site_source;
          mergedNotes = Object.keys(mergedNotes).length > 0 ? mergedNotes : (orderData.notes || {});
        } catch (error) {
          console.error(`Validate: Failed to fetch order ${latestPayment.order_id}:`, error);
        }
      }

      if (!event_id || !user_id || !isOurPortalSource(site_source)) {
        await prisma.razorpay_sync_hub_records.update({
          where: { id: record.id },
          data: {
            ...updateData,
            event_id: event_id ?? null,
            user_id: user_id ?? null,
            notes: mergedNotes,
            reconciled: true,
            reconciled_at: new Date(),
          },
        });
        removedCount++;
        continue;
      }

      const registration = await prisma.registrations.findFirst({
        where: { event_id, user_id },
        select: { id: true, status: true },
      });

      if (!registration || !PENDING_REGISTRATION_STATUSES.includes(registration.status as any)) {
        await prisma.razorpay_sync_hub_records.update({
          where: { id: record.id },
          data: {
            ...updateData,
            event_id,
            user_id,
            registration_id: registration?.id ?? null,
            notes: mergedNotes,
            reconciled: true,
            reconciled_at: new Date(),
          },
        });
        removedCount++;
        continue;
      }

      await prisma.razorpay_sync_hub_records.update({
        where: { id: record.id },
        data: {
          ...updateData,
          event_id,
          user_id,
          registration_id: registration.id,
          notes: mergedNotes,
          reconciled: false,
          reconciled_at: null,
        },
      });
    } catch (error) {
      console.error(`Validate: Failed to verify ${record.razorpay_payment_id}:`, error);
    }
  }

  return {
    validatedCount: records.length,
    removedCount,
  };
}

async function getPersistedDiscrepancies() {
  const records = await prisma.razorpay_sync_hub_records.findMany({
    where: {
      reconciled: false,
      status: 'captured',
    },
    orderBy: { razorpay_created_at: 'desc' },
  });

  if (records.length === 0) {
    return [];
  }

  const paymentIds = records.map((record) => record.razorpay_payment_id);
  const orderIds = records.map((record) => record.razorpay_order_id).filter(Boolean) as string[];
  const registrationIds = records.map((record) => record.registration_id).filter(Boolean) as string[];
  const compositeKeys = Array.from(
    new Set(
      records
        .map((record) => getCompositeKey(record.event_id, record.user_id))
        .filter(Boolean) as string[]
    )
  );

  const [existingPayments, directRegistrations, mappedRegistrations] = await Promise.all([
    prisma.payments.findMany({
      where: {
        OR: [
          { razorpay_payment_id: { in: paymentIds } },
          ...(orderIds.length > 0 ? [{ razorpay_order_id: { in: orderIds } }] : []),
        ],
      },
      select: {
        razorpay_payment_id: true,
        razorpay_order_id: true,
        registration_id: true,
      },
    }),
    registrationIds.length > 0
      ? prisma.registrations.findMany({
          where: { id: { in: registrationIds } },
          include: {
            event: { select: { title: true } },
            user: { select: { full_name: true, email: true, phone_number: true } },
          },
        })
      : Promise.resolve([]),
    compositeKeys.length > 0
      ? prisma.registrations.findMany({
          where: {
            OR: compositeKeys.map((key) => {
              const [event_id, user_id] = key.split(':');
              return { event_id, user_id };
            }),
          },
          include: {
            event: { select: { title: true } },
            user: { select: { full_name: true, email: true, phone_number: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const existingPaymentByPaymentId = new Map(
    existingPayments
      .filter((payment) => payment.razorpay_payment_id)
      .map((payment) => [payment.razorpay_payment_id as string, payment])
  );
  const existingPaymentByOrderId = new Map(
    existingPayments
      .filter((payment) => payment.razorpay_order_id)
      .map((payment) => [payment.razorpay_order_id as string, payment])
  );
  const registrationById = new Map(directRegistrations.map((registration) => [registration.id, registration]));
  const registrationByCompositeKey = new Map(
    mappedRegistrations
      .map((registration) => {
        const key = getCompositeKey(registration.event_id, registration.user_id);
        return key ? ([key, registration] as const) : null;
      })
      .filter(Boolean) as readonly (readonly [string, (typeof mappedRegistrations)[number]])[]
  );

  const discrepancyRows = [];
  const recordIdsToReconcile: string[] = [];

  for (const record of records) {
    const existingPayment =
      existingPaymentByPaymentId.get(record.razorpay_payment_id) ||
      (record.razorpay_order_id ? existingPaymentByOrderId.get(record.razorpay_order_id) : undefined);

    if (existingPayment) {
      recordIdsToReconcile.push(record.id);
      continue;
    }

    const registration =
      (record.registration_id ? registrationById.get(record.registration_id) : undefined) ||
      registrationByCompositeKey.get(getCompositeKey(record.event_id, record.user_id) || '');

    if (!registration) {
      continue;
    }

    if (!PENDING_REGISTRATION_STATUSES.includes(registration.status as any)) {
      recordIdsToReconcile.push(record.id);
      continue;
    }

    discrepancyRows.push({
      payment_id: record.razorpay_payment_id,
      order_id: record.razorpay_order_id,
      amount: Number(record.amount),
      currency: record.currency,
      created_at: record.razorpay_created_at.toISOString(),
      registration_id: registration.id,
      event_title: registration.event?.title || 'Unknown Event',
      user_name: registration.user?.full_name || 'Unknown User',
      user_email: registration.user?.email || '',
      user_phone: resolvePhoneNumber(registration, record),
      method: record.method || 'unknown',
      status: record.status,
      ...extractTransactionDetails(record),
    });
  }

  if (recordIdsToReconcile.length > 0) {
    await prisma.razorpay_sync_hub_records.updateMany({
      where: { id: { in: recordIdsToReconcile } },
      data: {
        reconciled: true,
        reconciled_at: new Date(),
      },
    });
  }

  return discrepancyRows;
}

async function scanPayments(scanLimit: number) {
  return scanPaymentsChunk(scanLimit, 0);
}

async function scanPaymentsChunk(scanLimit: number, startSkip: number) {
  const payments: any[] = [];
  const seenPaymentIds = new Set<string>();
  const chunkTarget = Math.min(scanLimit, startSkip + MAX_SCAN_CHUNK);
  let currentSkip = startSkip;

  for (; currentSkip < chunkTarget;) {
    const remaining = chunkTarget - currentSkip;
    const count = Math.min(PAGE_SIZE, remaining);
    const page = await fetchFromRazorpay(`payments?count=${count}&skip=${currentSkip}`);
    const items = page.items || [];
    const uniqueItems = items.filter((item: any) => {
      if (!item?.id || seenPaymentIds.has(item.id)) {
        return false;
      }
      seenPaymentIds.add(item.id);
      return true;
    });

    payments.push(...uniqueItems);

    if (items.length === 0 || uniqueItems.length === 0) {
      break;
    }

    currentSkip += uniqueItems.length;
  }

  const capturedPayments = payments.filter(isCapturedPayment);
  const orderCache = new Map<string, any>();
  const paymentIds = capturedPayments.map((payment) => payment.id);
  const orderIds = capturedPayments.map((payment) => payment.order_id).filter(Boolean) as string[];

  const existingCorePayments = paymentIds.length > 0
    ? await prisma.payments.findMany({
        where: {
          OR: [
            { razorpay_payment_id: { in: paymentIds } },
            ...(orderIds.length > 0 ? [{ razorpay_order_id: { in: orderIds } }] : []),
          ],
        },
        select: {
          razorpay_payment_id: true,
          razorpay_order_id: true,
          registration_id: true,
        },
      })
    : [];

  const existingCoreByPaymentId = new Map(
    existingCorePayments
      .filter((payment) => payment.razorpay_payment_id)
      .map((payment) => [payment.razorpay_payment_id as string, payment])
  );
  const existingCoreByOrderId = new Map(
    existingCorePayments
      .filter((payment) => payment.razorpay_order_id)
      .map((payment) => [payment.razorpay_order_id as string, payment])
  );

  const candidatePayments: Array<{
    payment: any;
    event_id: string;
    user_id: string;
    notes: any;
  }> = [];

  const preparedPayments = await runInBatches(capturedPayments, PROCESSING_BATCH_SIZE, async (payment) => {
    try {
      const existingCorePayment =
        existingCoreByPaymentId.get(payment.id) ||
        (payment.order_id ? existingCoreByOrderId.get(payment.order_id) : undefined);

      if (existingCorePayment) {
        const coreRecordData = {
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
          registration_id: existingCorePayment.registration_id ?? null,
          reconciled: true,
          reconciled_at: new Date(),
        };

        await prisma.razorpay_sync_hub_records.upsert({
          where: { razorpay_payment_id: payment.id },
          update: coreRecordData,
          create: {
            razorpay_payment_id: payment.id,
            ...coreRecordData,
          },
        });

        return null;
      }

      let event_id = payment.notes?.event_id;
      let user_id = payment.notes?.user_id;
      let site_source = payment.notes?.site_source;
      let notes = payment.notes || {};

      if ((!event_id || !user_id || !site_source) && payment.order_id) {
        try {
          let orderData = orderCache.get(payment.order_id);
          if (!orderData) {
            orderData = await fetchFromRazorpay(`orders/${payment.order_id}`);
            orderCache.set(payment.order_id, orderData);
          }

          event_id = event_id || orderData.notes?.event_id;
          user_id = user_id || orderData.notes?.user_id;
          site_source = site_source || orderData.notes?.site_source;
          notes = Object.keys(notes).length > 0 ? notes : (orderData.notes || {});
        } catch (error) {
          console.error(`Reconcile: Failed to fetch order ${payment.order_id}:`, error);
        }
      }

      if (!event_id || !user_id || !isOurPortalSource(site_source)) {
        return {
          payment,
          event_id: null,
          user_id: null,
          notes,
        };
      }

      return { payment, event_id, user_id, notes };
    } catch (error) {
      console.error(`Error preparing payment ${payment.id}:`, error);
      return null;
    }
  });

  for (const preparedPayment of preparedPayments) {
    if (!preparedPayment || !preparedPayment.event_id || !preparedPayment.user_id) {
      continue;
    }
    candidatePayments.push(preparedPayment);
  }

  const registrationKeys = Array.from(
    new Set(
      candidatePayments
        .map((item) => getCompositeKey(item.event_id, item.user_id))
        .filter(Boolean) as string[]
    )
  );

  const registrations = registrationKeys.length > 0
    ? await prisma.registrations.findMany({
        where: {
          OR: registrationKeys.map((key) => {
            const [event_id, user_id] = key.split(':');
            return { event_id, user_id };
          }),
        },
        select: {
          id: true,
          event_id: true,
          user_id: true,
          status: true,
        },
      })
    : [];

  const registrationByKey = new Map(
    registrations
      .map((registration) => {
        const key = getCompositeKey(registration.event_id, registration.user_id);
        return key ? ([key, registration] as const) : null;
      })
      .filter(Boolean) as readonly (readonly [string, (typeof registrations)[number]])[]
  );

  await runInBatches(candidatePayments, PROCESSING_BATCH_SIZE, async (item) => {
    try {
      const registration = registrationByKey.get(getCompositeKey(item.event_id, item.user_id) || '');
      if (!registration) {
        return null;
      }

      const isPendingRegistration = PENDING_REGISTRATION_STATUSES.includes(registration.status as any);
      const syncRecordData = {
        razorpay_order_id: item.payment.order_id,
        amount: item.payment.amount / 100,
        currency: item.payment.currency,
        status: item.payment.status,
        method: item.payment.method,
        description: item.payment.description,
        email: item.payment.email,
        contact: item.payment.contact,
        notes: item.notes || {},
        fee: item.payment.fee ? item.payment.fee / 100 : null,
        tax: item.payment.tax ? item.payment.tax / 100 : null,
        error_code: item.payment.error_code,
        error_description: item.payment.error_description,
        acquirer_data: item.payment.acquirer_data || {},
        vpa: item.payment.vpa,
        card_id: item.payment.card_id,
        bank: item.payment.bank,
        wallet: item.payment.wallet,
        razorpay_created_at: new Date(item.payment.created_at * 1000),
        raw_response: item.payment,
        event_id: item.event_id,
        user_id: item.user_id,
        registration_id: registration.id,
        reconciled: !isPendingRegistration,
        reconciled_at: isPendingRegistration ? null : new Date(),
      };

      await prisma.razorpay_sync_hub_records.upsert({
        where: { razorpay_payment_id: item.payment.id },
        update: syncRecordData,
        create: {
          razorpay_payment_id: item.payment.id,
          ...syncRecordData,
        },
      });
    } catch (error) {
      console.error(`Error processing payment ${item.payment.id}:`, error);
    }

    return null;
  });

  return {
    requestedScanLimit: scanLimit,
    chunkScannedCount: payments.length,
    nextSkip: currentSkip,
    completed: currentSkip >= scanLimit || payments.length === 0,
  };
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const discrepancies = await getPersistedDiscrepancies();
    return NextResponse.json({ success: true, discrepancies });
  } catch (error: any) {
    console.error('Fetch persisted discrepancies failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch discrepancies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!RAZORPAY_KEY || !RAZORPAY_SECRET) {
      return NextResponse.json({ success: false, error: 'Razorpay keys not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action;

    if (action === 'validate') {
      const validationSummary = await validatePersistedRecords();
      const discrepancies = await getPersistedDiscrepancies();

      return NextResponse.json({
        success: true,
        discrepancies,
        validationSummary,
      });
    }

    const scanLimit = normalizeScanLimit(body.scanLimit);
    const startSkip = Math.max(0, Number(body.startSkip) || 0);
    const scanSummary = await scanPaymentsChunk(scanLimit, startSkip);

    if (!scanSummary.completed) {
      return NextResponse.json({
        success: true,
        requestedScanLimit: scanSummary.requestedScanLimit,
        chunkScannedCount: scanSummary.chunkScannedCount,
        nextSkip: scanSummary.nextSkip,
        completed: false,
      });
    }

    const discrepancies = await getPersistedDiscrepancies();

    return NextResponse.json({
      success: true,
      discrepancies,
      requestedScanLimit: scanSummary.requestedScanLimit,
      chunkScannedCount: scanSummary.chunkScannedCount,
      nextSkip: scanSummary.nextSkip,
      completed: true,
    });
  } catch (error: any) {
    console.error('Fetch discrepancies failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch discrepancies' },
      { status: 500 }
    );
  }
}
