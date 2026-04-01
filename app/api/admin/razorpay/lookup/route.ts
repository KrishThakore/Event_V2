import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serializePrisma } from '@/lib/serialize';

export const maxDuration = 300;

const DEFAULT_RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const DEFAULT_RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const PAGE_SIZE = 100;
const DEFAULT_SCAN_LIMIT = 1000;
const MIN_SCAN_LIMIT = 100;
const MAX_SCAN_LIMIT = 5000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type LookupCandidate = {
  path: string;
  label: string;
  value: string;
};

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return null;
  }
  return session;
}

function maskKeyId(keyId: string) {
  if (keyId.length <= 8) return keyId;
  return `${keyId.slice(0, 6)}...${keyId.slice(-4)}`;
}

function resolveCredentials(body: any) {
  const inputKeyId = String(body?.razorpayKeyId ?? '').trim();
  const inputKeySecret = String(body?.razorpayKeySecret ?? '').trim();

  if ((inputKeyId && !inputKeySecret) || (!inputKeyId && inputKeySecret)) {
    throw new Error('Both Razorpay key ID and key secret are required when using manual live credentials.');
  }

  const keyId = inputKeyId || DEFAULT_RAZORPAY_KEY_ID || '';
  const keySecret = inputKeySecret || DEFAULT_RAZORPAY_KEY_SECRET || '';

  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys are not configured on this environment, and no manual live credentials were provided.');
  }

  return {
    keyId,
    keySecret,
    source: inputKeyId && inputKeySecret ? 'manual_input' : 'environment',
    maskedKeyId: maskKeyId(keyId),
  };
}

async function fetchFromRazorpay(
  endpoint: string,
  credentials: { keyId: string; keySecret: string }
) {
  const auth = Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1/${endpoint}`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    const error = await response.text();
    const wrapped = new Error(`Razorpay request failed (${response.status})`);
    (wrapped as any).status = response.status;
    (wrapped as any).details = error;
    throw wrapped;
  }

  return response.json();
}

function normalizeScanLimit(input: unknown) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return DEFAULT_SCAN_LIMIT;
  return Math.min(MAX_SCAN_LIMIT, Math.max(MIN_SCAN_LIMIT, Math.floor(parsed)));
}

function normalizeStrict(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeLoose(value: unknown) {
  return normalizeStrict(value).replace(/[^a-z0-9]/g, '');
}

function isMatch(query: string, candidate: string) {
  const strictQuery = normalizeStrict(query);
  const strictCandidate = normalizeStrict(candidate);

  if (!strictQuery || !strictCandidate) return false;
  if (strictQuery === strictCandidate) return true;

  const looseQuery = normalizeLoose(query);
  const looseCandidate = normalizeLoose(candidate);

  return looseQuery.length >= 6 && looseQuery === looseCandidate;
}

function toTitleCase(input: string) {
  return input
    .replace(/\[(\d+)\]/g, ' $1 ')
    .replace(/[_\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bUpi\b/g, 'UPI')
    .replace(/\bVpa\b/g, 'VPA')
    .replace(/\bRrn\b/g, 'RRN')
    .replace(/\bId\b/g, 'ID')
    .replace(/\bApi\b/g, 'API')
    .replace(/\bUrl\b/g, 'URL');
}

function asRecord(value: unknown): Record<string, any> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, any>;
}

function flattenLeafCandidates(
  value: unknown,
  prefix: string,
  customLabelPrefix?: string
): LookupCandidate[] {
  if (value === null || value === undefined) return [];

  if (typeof value === 'string' || typeof value === 'number') {
    const stringValue = String(value).trim();
    if (!stringValue) return [];

    return [
      {
        path: prefix,
        label: customLabelPrefix || toTitleCase(prefix.split('.').pop() || prefix),
        value: stringValue,
      },
    ];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenLeafCandidates(item, `${prefix}[${index}]`));
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      flattenLeafCandidates(child, `${prefix}.${key}`)
    );
  }

  return [];
}

function dedupeCandidates(candidates: LookupCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const signature = `${candidate.path}::${candidate.value}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function collectLookupCandidates(payment: any, order?: any | null) {
  const candidates: LookupCandidate[] = [];

  if (payment?.id) {
    candidates.push({
      path: 'payment.id',
      label: 'Razorpay Payment ID',
      value: String(payment.id),
    });
  }

  if (payment?.order_id) {
    candidates.push({
      path: 'payment.order_id',
      label: 'Razorpay Order ID',
      value: String(payment.order_id),
    });
  }

  if (payment?.invoice_id) {
    candidates.push({
      path: 'payment.invoice_id',
      label: 'Invoice ID',
      value: String(payment.invoice_id),
    });
  }

  if (payment?.vpa) {
    candidates.push({
      path: 'payment.vpa',
      label: 'UPI VPA',
      value: String(payment.vpa),
    });
  }

  candidates.push(...flattenLeafCandidates(payment?.acquirer_data, 'payment.acquirer_data'));
  candidates.push(...flattenLeafCandidates(payment?.upi, 'payment.upi'));
  candidates.push(...flattenLeafCandidates(payment?.notes, 'payment.notes'));
  candidates.push(...flattenLeafCandidates(order?.notes, 'order.notes'));

  return dedupeCandidates(candidates);
}

function collectTransactionReferences(payment: any) {
  const references: LookupCandidate[] = [];

  if (payment?.id) {
    references.push({
      path: 'payment.id',
      label: 'Razorpay Payment ID',
      value: String(payment.id),
    });
  }

  if (payment?.order_id) {
    references.push({
      path: 'payment.order_id',
      label: 'Razorpay Order ID',
      value: String(payment.order_id),
    });
  }

  if (payment?.invoice_id) {
    references.push({
      path: 'payment.invoice_id',
      label: 'Invoice ID',
      value: String(payment.invoice_id),
    });
  }

  if (payment?.vpa) {
    references.push({
      path: 'payment.vpa',
      label: 'UPI VPA',
      value: String(payment.vpa),
    });
  }

  references.push(...flattenLeafCandidates(payment?.acquirer_data, 'payment.acquirer_data'));
  references.push(...flattenLeafCandidates(payment?.upi, 'payment.upi'));

  return dedupeCandidates(references);
}

function selectPrimaryPayment(items: any[]) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return [...items].sort((left, right) => {
    const leftCaptured = left?.status === 'captured' || left?.captured ? 1 : 0;
    const rightCaptured = right?.status === 'captured' || right?.captured ? 1 : 0;

    if (leftCaptured !== rightCaptured) {
      return rightCaptured - leftCaptured;
    }

    return Number(right?.created_at ?? 0) - Number(left?.created_at ?? 0);
  })[0];
}

function toIsoFromUnixTimestamp(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return new Date(parsed * 1000).toISOString();
}

function buildScanCoverage(items: any[]) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      newestScannedAt: null,
      oldestScannedAt: null,
    };
  }

  const timestamps = items
    .map((item) => Number(item?.created_at))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (timestamps.length === 0) {
    return {
      newestScannedAt: null,
      oldestScannedAt: null,
    };
  }

  return {
    newestScannedAt: new Date(Math.max(...timestamps) * 1000).toISOString(),
    oldestScannedAt: new Date(Math.min(...timestamps) * 1000).toISOString(),
  };
}

function buildRefundSummary(refundResponse: any) {
  const items = Array.isArray(refundResponse?.items) ? refundResponse.items : [];
  const refundTimestamps = items
    .map((item: any) => Number(item?.created_at || 0))
    .filter((value: number) => value > 0);

  return {
    razorpayRefundMade: items.length > 0,
    refundCount: items.length,
    totalRefundedAmount: items.reduce(
      (sum: number, item: any) => sum + (Number(item?.amount || 0) / 100),
      0
    ),
    latestRefundAt:
      refundTimestamps.length > 0 ? new Date(Math.max(...refundTimestamps) * 1000).toISOString() : null,
    refunds: items.map((item: any) => ({
      id: item.id,
      status: item.status || 'unknown',
      amount: Number(item?.amount || 0) / 100,
      currency: item.currency || null,
      receipt: item.receipt || null,
      payment_id: item.payment_id || null,
      created_at: toIsoFromUnixTimestamp(item?.created_at),
      notes: item.notes || {},
      acquirer_data: item.acquirer_data || {},
    })),
  };
}

function getSiteSource(payment: any, order: any | null) {
  const paymentNotes = asRecord(payment?.notes) || {};
  const orderNotes = asRecord(order?.notes) || {};
  const value = paymentNotes.site_source || orderNotes.site_source || null;

  return {
    present: Boolean(value),
    value: value || null,
    source: paymentNotes.site_source
      ? 'payment.notes.site_source'
      : orderNotes.site_source
        ? 'order.notes.site_source'
        : null,
  };
}

async function searchRazorpayPayment(
  query: string,
  scanLimit: number,
  credentials: { keyId: string; keySecret: string }
) {
  if (/^pay_[a-z0-9]+$/i.test(query)) {
    const payment = await fetchFromRazorpay(`payments/${encodeURIComponent(query)}`, credentials);
    return {
      payment,
      mode: 'payment_id',
      scannedCount: 1,
      scanCoverage: {
        newestScannedAt: toIsoFromUnixTimestamp(payment?.created_at),
        oldestScannedAt: toIsoFromUnixTimestamp(payment?.created_at),
      },
      matchedField: 'payment.id',
      matchedLabel: 'Razorpay Payment ID',
      matchedValue: payment.id,
      order: null as any,
      orderPayments: [] as any[],
    };
  }

  if (/^order_[a-z0-9]+$/i.test(query)) {
    const order = await fetchFromRazorpay(`orders/${encodeURIComponent(query)}`, credentials);
    const orderPaymentResponse = await fetchFromRazorpay(
      `orders/${encodeURIComponent(query)}/payments`,
      credentials
    );
    const orderPayments = Array.isArray(orderPaymentResponse?.items) ? orderPaymentResponse.items : [];
    const primaryPayment = selectPrimaryPayment(orderPayments);

    if (!primaryPayment) {
      return {
        payment: null,
        mode: 'order_id',
        scannedCount: 0,
        scanCoverage: buildScanCoverage(orderPayments),
        matchedField: 'order.id',
        matchedLabel: 'Razorpay Order ID',
        matchedValue: order.id,
        order,
        orderPayments,
      };
    }

    const payment = await fetchFromRazorpay(
      `payments/${encodeURIComponent(primaryPayment.id)}`,
      credentials
    );

    return {
      payment,
      mode: 'order_id',
      scannedCount: orderPayments.length || 1,
      scanCoverage: buildScanCoverage(orderPayments),
      matchedField: 'payment.order_id',
      matchedLabel: 'Razorpay Order ID',
      matchedValue: order.id,
      order,
      orderPayments,
    };
  }

  let skip = 0;
  let scannedCount = 0;
  const scannedItems: any[] = [];

  while (scannedCount < scanLimit) {
    const remaining = scanLimit - scannedCount;
    const count = Math.min(PAGE_SIZE, remaining);
    const page = await fetchFromRazorpay(`payments?count=${count}&skip=${skip}`, credentials);
    const items = Array.isArray(page?.items) ? page.items : [];

    if (items.length === 0) {
      break;
    }

    scannedItems.push(...items);

    for (const item of items) {
      scannedCount += 1;
      const matchedCandidate = collectLookupCandidates(item).find((candidate) =>
        isMatch(query, candidate.value)
      );

      if (matchedCandidate) {
        const payment = await fetchFromRazorpay(
          `payments/${encodeURIComponent(item.id)}`,
          credentials
        );

        return {
          payment,
          mode: 'scan',
          scannedCount,
          scanCoverage: buildScanCoverage(scannedItems.slice(0, scannedCount)),
          matchedField: matchedCandidate.path,
          matchedLabel: matchedCandidate.label,
          matchedValue: matchedCandidate.value,
          order: null as any,
          orderPayments: [] as any[],
        };
      }
    }

    if (items.length < count) {
      break;
    }

    skip += items.length;
  }

  return {
    payment: null,
    mode: 'scan',
    scannedCount,
    scanCoverage: buildScanCoverage(scannedItems.slice(0, scannedCount)),
    matchedField: null,
    matchedLabel: null,
    matchedValue: null,
    order: null as any,
    orderPayments: [] as any[],
  };
}

function isUuid(value: string | null | undefined) {
  return Boolean(value && UUID_PATTERN.test(value));
}

async function buildLocalContext(payment: any, order: any | null) {
  const registrationInclude: any = {
    event: {
      select: {
        id: true,
        title: true,
        location: true,
        event_date: true,
        status: true,
        is_paid: true,
        price: true,
        currency: true,
        pricing_type: true,
      },
    },
    user: {
      select: {
        id: true,
        full_name: true,
        email: true,
        phone_number: true,
        university: true,
        role: true,
        disabled: true,
        created_at: true,
      },
    },
    pricing_option: {
      select: {
        id: true,
        label: true,
        price: true,
        currency: true,
        price_inr: true,
        price_usd: true,
      },
    },
    responses: {
      include: {
        field: {
          select: {
            id: true,
            label: true,
            field_type: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    },
  };

  const paymentNotes = asRecord(payment?.notes) || {};
  const orderNotes = asRecord(order?.notes) || {};
  const metadataEventId = paymentNotes.event_id || orderNotes.event_id || null;
  const metadataUserId = paymentNotes.user_id || orderNotes.user_id || null;
  const localWhere: any = {
    OR: [
      { razorpay_payment_id: payment.id },
      ...(payment?.order_id ? [{ razorpay_order_id: payment.order_id }] : []),
    ],
  };
  const syncWhere: any = {
    OR: [
      { razorpay_payment_id: payment.id },
      ...(payment?.order_id ? [{ razorpay_order_id: payment.order_id }] : []),
    ],
  };

  const [corePayment, syncHubRecord] = await Promise.all([
    prisma.payments.findFirst({
      where: localWhere,
      include: {
        registration: {
          include: registrationInclude,
        } as any,
      } as any,
    }),
    prisma.razorpay_sync_hub_records.findFirst({
      where: syncWhere,
      select: {
        id: true,
        razorpay_payment_id: true,
        razorpay_order_id: true,
        status: true,
        method: true,
        amount: true,
        currency: true,
        notes: true,
        event_id: true,
        user_id: true,
        registration_id: true,
        reconciled: true,
        reconciled_at: true,
        synced_at: true,
      },
    }),
  ]);

  let registration: any = corePayment?.registration || null;

  if (!registration && isUuid(syncHubRecord?.registration_id || undefined)) {
    registration = await prisma.registrations.findUnique({
      where: { id: syncHubRecord!.registration_id! },
      include: registrationInclude,
    } as any);
  }

  if (!registration && isUuid(metadataEventId) && isUuid(metadataUserId)) {
    registration = await prisma.registrations.findFirst({
      where: {
        event_id: metadataEventId,
        user_id: metadataUserId,
      },
      include: registrationInclude,
    } as any);
  }

  const userId = registration?.user?.id || metadataUserId || syncHubRecord?.user_id || null;
  const eventId = registration?.event?.id || metadataEventId || syncHubRecord?.event_id || null;

  const [user, event] = await Promise.all([
    !registration?.user && isUuid(userId)
      ? prisma.profiles.findUnique({
          where: { id: userId! },
          select: {
            id: true,
            full_name: true,
            email: true,
            phone_number: true,
            university: true,
            role: true,
            disabled: true,
            created_at: true,
          },
        })
      : Promise.resolve(registration?.user || null),
    !registration?.event && isUuid(eventId)
      ? prisma.events.findUnique({
          where: { id: eventId! },
          select: {
            id: true,
            title: true,
            location: true,
            event_date: true,
            status: true,
            is_paid: true,
            price: true,
            currency: true,
            pricing_type: true,
          },
        })
      : Promise.resolve(registration?.event || null),
  ]);

  return serializePrisma({
    corePayment,
    syncHubRecord,
    registration,
    user,
    event,
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const query = String(body?.query ?? '').trim();
    const scanLimit = normalizeScanLimit(body?.scanLimit);
    const credentials = resolveCredentials(body);

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required.' },
        { status: 400 }
      );
    }

    const searchResult = await searchRazorpayPayment(query, scanLimit, credentials);

    if (!searchResult.payment) {
      return NextResponse.json(
        {
          success: false,
          error:
            searchResult.mode === 'order_id'
              ? `Order ${query} was found in Razorpay, but it does not have any attached payments yet.`
              : `No Razorpay payment matched "${query}" in the last ${searchResult.scannedCount.toLocaleString(
                  'en-IN'
                )} payments scanned.`,
          lookup: {
            query,
            requestedScanLimit: scanLimit,
            actualScannedCount: searchResult.scannedCount,
            credentialSource: credentials.source,
            credentialKeyId: credentials.maskedKeyId,
            lookedUpAt: new Date().toISOString(),
            newestScannedAt: searchResult.scanCoverage?.newestScannedAt || null,
            oldestScannedAt: searchResult.scanCoverage?.oldestScannedAt || null,
            lastFetchedRecordAt: searchResult.scanCoverage?.oldestScannedAt || null,
            mode: searchResult.mode,
            scannedCount: searchResult.scannedCount,
            matchedField: searchResult.matchedField,
            matchedLabel: searchResult.matchedLabel,
            matchedValue: searchResult.matchedValue,
          },
          order: searchResult.order,
          orderPayments: searchResult.orderPayments,
        },
        { status: 404 }
      );
    }

    const payment = searchResult.payment;
    let order = searchResult.order;
    let orderPayments = searchResult.orderPayments;

    if (payment.order_id && !order) {
      try {
        order = await fetchFromRazorpay(`orders/${encodeURIComponent(payment.order_id)}`, credentials);
      } catch (error) {
        console.error(`Failed to fetch order ${payment.order_id}:`, error);
      }
    }

    if (payment.order_id && (!Array.isArray(orderPayments) || orderPayments.length === 0)) {
      try {
        const orderPaymentResponse = await fetchFromRazorpay(
          `orders/${encodeURIComponent(payment.order_id)}/payments`,
          credentials
        );
        orderPayments = Array.isArray(orderPaymentResponse?.items) ? orderPaymentResponse.items : [];
      } catch (error) {
        console.error(`Failed to fetch order payments for ${payment.order_id}:`, error);
        orderPayments = [];
      }
    }

    const paymentNotes = asRecord(payment.notes) || {};
    const orderNotes = asRecord(order?.notes) || {};
    const mergedNotes = { ...orderNotes, ...paymentNotes };
    const siteSource = getSiteSource(payment, order);
    let refundSummary = {
      razorpayRefundMade: false,
      refundCount: 0,
      totalRefundedAmount: 0,
      latestRefundAt: null as string | null,
      refunds: [] as any[],
      refundCheckError: null as string | null,
    };

    try {
      const refundResponse = await fetchFromRazorpay(
        `payments/${encodeURIComponent(payment.id)}/refunds?count=100`,
        credentials
      );
      refundSummary = {
        ...refundSummary,
        ...buildRefundSummary(refundResponse),
      };
    } catch (error: any) {
      console.error(`Failed to fetch refunds for ${payment.id}:`, error);
      refundSummary.refundCheckError = error?.message || 'Unable to verify refunds from Razorpay.';
    }

    const local = await buildLocalContext(payment, order);

    return NextResponse.json(
      serializePrisma({
        success: true,
        lookup: {
          query,
          requestedScanLimit: scanLimit,
          actualScannedCount: searchResult.scannedCount,
          credentialSource: credentials.source,
          credentialKeyId: credentials.maskedKeyId,
          lookedUpAt: new Date().toISOString(),
          newestScannedAt: searchResult.scanCoverage?.newestScannedAt || null,
          oldestScannedAt: searchResult.scanCoverage?.oldestScannedAt || null,
          lastFetchedRecordAt: searchResult.scanCoverage?.oldestScannedAt || null,
          mode: searchResult.mode,
          scannedCount: searchResult.scannedCount,
          matchedField: searchResult.matchedField,
          matchedLabel: searchResult.matchedLabel,
          matchedValue: searchResult.matchedValue,
        },
        summary: {
          payment_id: payment.id,
          order_id: payment.order_id || order?.id || null,
          invoice_id: payment.invoice_id || null,
          amount: typeof payment.amount === 'number' ? payment.amount / 100 : null,
          currency: payment.currency || 'INR',
          status: payment.status || 'unknown',
          method: payment.method || 'unknown',
          captured: typeof payment.captured === 'boolean' ? payment.captured : payment.status === 'captured',
          created_at:
            typeof payment.created_at === 'number'
              ? new Date(payment.created_at * 1000).toISOString()
              : null,
          email: payment.email || null,
          contact: payment.contact || null,
          description: payment.description || null,
          vpa: payment.vpa || payment.upi?.vpa || null,
        },
        siteSource,
        refunds: refundSummary,
        transactionReferences: collectTransactionReferences(payment),
        metadata: {
          paymentNotes,
          orderNotes,
          mergedNotes,
        },
        orderPayments: (Array.isArray(orderPayments) ? orderPayments : []).map((item: any) => ({
          id: item.id,
          status: item.status,
          method: item.method || null,
          amount: typeof item.amount === 'number' ? item.amount / 100 : null,
          currency: item.currency || null,
          created_at:
            typeof item.created_at === 'number'
              ? new Date(item.created_at * 1000).toISOString()
              : null,
        })),
        local,
        raw: {
          payment,
          order,
        },
      })
    );
  } catch (error: any) {
    console.error('Razorpay lookup failed:', error);

    const status = Number(error?.status) || 500;
    return NextResponse.json(
      {
        success: false,
        error:
          status === 404
            ? 'The requested Razorpay record was not found.'
            : error?.message || 'Razorpay lookup failed.',
        details: error?.details || null,
      },
      { status }
    );
  }
}
