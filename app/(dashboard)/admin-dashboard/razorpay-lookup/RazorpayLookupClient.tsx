'use client';

import type { ReactNode } from 'react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  type LucideIcon,
  Search,
  Loader2,
  CreditCard,
  FileJson,
  Link2,
  ShieldCheck,
  User,
  Calendar,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type LookupResult = any;

function formatCurrency(amount: number | null | undefined, currency = 'INR') {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return 'Not available';

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function isEmptyValue(value: unknown) {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

function JsonBlock({ value, emptyLabel = 'No data available.' }: { value: unknown; emptyLabel?: string }) {
  if (isEmptyValue(value)) {
    return <p className="text-sm text-gray-500">{emptyLabel}</p>;
  }

  return (
    <pre className="max-h-[28rem] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function KeyValueList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{item.label}</p>
          <div className="mt-2 text-sm font-medium text-gray-900 break-words">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const toneMap = {
    default: 'border-gray-200 bg-white text-gray-900',
    success: 'border-green-200 bg-green-50 text-green-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone]}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="mt-3 text-sm font-medium break-words">{value}</div>
    </div>
  );
}

export default function RazorpayLookupClient({
  initialQuery,
  initialScanLimit,
}: {
  initialQuery: string;
  initialScanLimit: number;
}) {
  const router = useRouter();
  const autoLoaded = useRef(false);
  const [query, setQuery] = useState(initialQuery);
  const [scanLimit, setScanLimit] = useState(String(initialScanLimit || 1000));
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [lastFailedLookup, setLastFailedLookup] = useState<any | null>(null);

  async function runLookup(nextQuery: string, nextScanLimit: string, showToast = true) {
    const trimmedQuery = nextQuery.trim();
    if (!trimmedQuery) {
      setError('Transaction ID is required.');
      setResult(null);
      if (showToast) toast.error('Transaction ID is required.');
      return;
    }

    setLoading(true);
    setError(null);

    const parsedScanLimit = Number(nextScanLimit) || 1000;
    const toastId = showToast ? toast.loading('Looking up payment in Razorpay...') : undefined;

    try {
      const response = await fetch('/api/admin/razorpay/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmedQuery,
          scanLimit: parsedScanLimit,
          razorpayKeyId: razorpayKeyId.trim() || undefined,
          razorpayKeySecret: razorpayKeySecret.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        const failedError = new Error(data?.error || 'Lookup failed');
        (failedError as any).payload = data;
        throw failedError;
      }

      setResult(data);
      setLastFailedLookup(null);
      setError(null);

      const params = new URLSearchParams();
      params.set('query', trimmedQuery);
      params.set('scanLimit', String(parsedScanLimit));
      router.replace(`/admin-dashboard/razorpay-lookup?${params.toString()}`, { scroll: false });

      if (toastId) {
        toast.success('Razorpay payment details loaded.', { id: toastId });
      }
    } catch (lookupError: any) {
      const message = lookupError?.message || 'Lookup failed';
      setResult(null);
      setLastFailedLookup(lookupError?.payload || null);
      setError(message);
      if (toastId) {
        toast.error(message, { id: toastId });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoLoaded.current) return;
    autoLoaded.current = true;

    if (initialQuery.trim()) {
      runLookup(initialQuery, String(initialScanLimit || 1000), false);
    }
  }, [initialQuery, initialScanLimit]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runLookup(query, scanLimit, true);
  }

  const siteSource = result?.siteSource;
  const local = result?.local;

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900 text-white shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-3xl font-black tracking-tight">
            <Search className="h-7 w-7" />
            Razorpay Payment Lookup
          </CardTitle>
          <CardDescription className="max-w-3xl text-sm text-slate-200">
            Search a payment using a UPI transaction reference, Google transaction reference,
            Razorpay payment ID, or order ID. The page pulls the live Razorpay payload, its notes,
            and the linked registration, user, and event data from this site.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-gray-200 bg-white">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900">Search Payment</CardTitle>
          <CardDescription>
            Use the transaction ID from the user's screenshot or message. If this local environment uses different Razorpay keys than the live site, paste the live key ID and secret below for a one-off lookup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Transaction or Payment Reference</label>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Example: pay_xxx, order_xxx, UPI RRN, Google transaction ID"
                className="h-11 rounded-xl"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Live Razorpay Key ID</label>
              <Input
                value={razorpayKeyId}
                onChange={(event) => setRazorpayKeyId(event.target.value)}
                placeholder="Optional: paste the live site's Razorpay key ID"
                className="h-11 rounded-xl"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Live Razorpay Key Secret</label>
              <Input
                type="password"
                value={razorpayKeySecret}
                onChange={(event) => setRazorpayKeySecret(event.target.value)}
                placeholder="Optional: paste the live site's Razorpay key secret"
                className="h-11 rounded-xl"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Scan Limit</label>
              <Input
                type="number"
                min={100}
                max={5000}
                step={100}
                value={scanLimit}
                onChange={(event) => setScanLimit(event.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex items-end">
              <Button
                type="submit"
                disabled={loading}
                className="h-11 rounded-xl bg-purple-600 px-6 text-white hover:bg-purple-700"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Search
              </Button>
            </div>
          </form>

          <p className="mt-4 text-xs text-gray-500">
            Manual Razorpay credentials are only used for the current search request. They are not written to the URL or saved in the database.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-red-900">Lookup failed</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            {lastFailedLookup?.lookup && (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-red-200 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                    Last Razorpay Payment Lookup
                  </p>
                  <p className="mt-2 text-sm font-medium text-red-950">
                    {formatDate(lastFailedLookup.lookup.lookedUpAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-red-200 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                    Last Fetched Razorpay Record
                  </p>
                  <p className="mt-2 text-sm font-medium text-red-950">
                    {formatDate(lastFailedLookup.lookup.lastFetchedRecordAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-red-200 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                    Actual Entries Scanned
                  </p>
                  <p className="mt-2 text-sm font-medium text-red-950">
                    {String(lastFailedLookup.lookup.actualScannedCount ?? 'Not available')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!result && !error && !loading && (
        <Card className="border-dashed border-gray-300 bg-white">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <CreditCard className="h-10 w-10 text-gray-400" />
            <div>
              <p className="text-lg font-semibold text-gray-900">Ready to inspect a payment</p>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                This page will show the live Razorpay payment payload, merged metadata, transaction references,
                site source status, and the linked local user and registration details.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <div className="grid gap-4 xl:grid-cols-6">
            <SummaryStat
              icon={CreditCard}
              label="Amount"
              value={formatCurrency(result.summary?.amount, result.summary?.currency)}
            />
            <SummaryStat
              icon={ShieldCheck}
              label="Status"
              value={
                <Badge className="bg-slate-900 text-white">
                  {String(result.summary?.status || 'unknown').toUpperCase()}
                </Badge>
              }
              tone={result.summary?.status === 'captured' ? 'success' : 'default'}
            />
            <SummaryStat icon={Link2} label="Matched Field" value={result.lookup?.matchedLabel || 'Not available'} />
            <SummaryStat icon={Calendar} label="Created At" value={formatDate(result.summary?.created_at)} />
            <SummaryStat
              icon={Info}
              label="Site Source"
              value={
                siteSource?.present ? (
                  <div className="space-y-1">
                    <Badge className="bg-green-100 text-green-800">{siteSource.value}</Badge>
                    <p className="text-xs text-green-700">{siteSource.source}</p>
                  </div>
                ) : (
                  <Badge className="bg-red-100 text-red-800">Site source not present</Badge>
                )
              }
              tone={siteSource?.present ? 'success' : 'danger'}
            />
            <SummaryStat
              icon={CreditCard}
              label="Razorpay Refund Made"
              value={
                result.refunds?.razorpayRefundMade ? (
                  <Badge className="bg-red-100 text-red-800">Yes</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800">No</Badge>
                )
              }
              tone={result.refunds?.razorpayRefundMade ? 'danger' : 'success'}
            />
          </div>

          <Card className="border-gray-200 bg-white">
            <CardContent className="p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-gray-900">Last Razorpay Payment Lookup</p>
                <p className="text-sm text-gray-600">{formatDate(result.lookup?.lookedUpAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 bg-white">
            <CardContent className="p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Scan Coverage End</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatDate(result.lookup?.newestScannedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Scan Coverage Start</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatDate(result.lookup?.oldestScannedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Requested Scan Limit</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {String(result.lookup?.requestedScanLimit ?? 'Not available')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Actual Entries Scanned</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {String(result.lookup?.actualScannedCount ?? 'Not available')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">Lookup Summary</CardTitle>
              <CardDescription>
                Search mode: <span className="font-semibold text-gray-700">{result.lookup?.mode}</span> |
                Actual entries scanned: <span className="font-semibold text-gray-700"> {result.lookup?.actualScannedCount}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <KeyValueList
                items={[
                  { label: 'Search Query', value: result.lookup?.query || 'Not available' },
                  { label: 'Matched Value', value: result.lookup?.matchedValue || 'Not available' },
                  { label: 'Requested Scan Limit', value: String(result.lookup?.requestedScanLimit ?? 'Not available') },
                  { label: 'Actual Entries Scanned', value: String(result.lookup?.actualScannedCount ?? 'Not available') },
                  { label: 'Last Lookup At', value: formatDate(result.lookup?.lookedUpAt) },
                  { label: 'Scan Coverage End', value: formatDate(result.lookup?.newestScannedAt) },
                  { label: 'Scan Coverage Start', value: formatDate(result.lookup?.oldestScannedAt) },
                  { label: 'Credential Source', value: result.lookup?.credentialSource || 'Not available' },
                  { label: 'Key ID Used', value: result.lookup?.credentialKeyId || 'Not available' },
                  { label: 'Razorpay Payment ID', value: result.summary?.payment_id || 'Not available' },
                  { label: 'Razorpay Order ID', value: result.summary?.order_id || 'Not available' },
                  { label: 'Method', value: result.summary?.method || 'Not available' },
                  { label: 'VPA', value: result.summary?.vpa || 'Not available' },
                  { label: 'Customer Email', value: result.summary?.email || 'Not available' },
                  { label: 'Customer Contact', value: result.summary?.contact || 'Not available' },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">Transaction References</CardTitle>
              <CardDescription>
                All lookup-friendly fields returned by Razorpay for this payment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3 rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Transaction Status
                </p>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {String(result.summary?.status || 'unknown').toUpperCase()}
                </p>
              </div>

              <div className="mb-3 rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Razorpay Refund Made
                </p>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {result.refunds?.razorpayRefundMade ? 'Yes' : 'No'}
                </p>
              </div>

              {Array.isArray(result.transactionReferences) && result.transactionReferences.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {result.transactionReferences.map((reference: any) => (
                    <div key={`${reference.path}-${reference.value}`} className="rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        {reference.label}
                      </p>
                      <p className="mt-2 break-words text-sm font-medium text-gray-900">{reference.value}</p>
                      <p className="mt-2 text-xs text-gray-500">{reference.path}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No transaction reference fields were returned for this payment.</p>
              )}
            </CardContent>
          </Card>

          {Array.isArray(result.orderPayments) && result.orderPayments.length > 1 && (
            <Card className="border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900">Order Payment Attempts</CardTitle>
                <CardDescription>
                  Other payment attempts attached to the same Razorpay order.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 lg:grid-cols-2">
                  {result.orderPayments.map((payment: any) => (
                    <div key={payment.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900">{payment.id}</p>
                        <Badge className="bg-slate-900 text-white">{String(payment.status || 'unknown').toUpperCase()}</Badge>
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-gray-600">
                        <p>Amount: {formatCurrency(payment.amount, payment.currency || 'INR')}</p>
                        <p>Method: {payment.method || 'Not available'}</p>
                        <p>Created: {formatDate(payment.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                <User className="h-5 w-5" />
                Linked Local Records
              </CardTitle>
              <CardDescription>
                Matching payment, registration, user, and event data from this site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <KeyValueList
                items={[
                  { label: 'Local Payment Record', value: local?.corePayment?.id || 'Not linked in payments table' },
                  { label: 'Local Payment Status', value: local?.corePayment?.status || 'Not available' },
                  { label: 'Registration ID', value: local?.registration?.id || 'Not linked' },
                  { label: 'Registration Status', value: local?.registration?.status || 'Not available' },
                  { label: 'Entry Code', value: local?.registration?.entry_code || 'Not available' },
                  { label: 'Payment Method', value: local?.registration?.payment_method || 'Not available' },
                  { label: 'User Name', value: local?.user?.full_name || 'Not available' },
                  { label: 'User Email', value: local?.user?.email || 'Not available' },
                  { label: 'Phone Number', value: local?.user?.phone_number || 'Not available' },
                  { label: 'University', value: local?.user?.university || 'Not available' },
                  { label: 'Event Title', value: local?.event?.title || 'Not available' },
                  { label: 'Event Date', value: formatDate(local?.event?.event_date) },
                ]}
              />

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">Registration Responses</p>
                {Array.isArray(local?.registration?.responses) && local.registration.responses.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {local.registration.responses.map((response: any) => (
                      <div key={response.id} className="rounded-xl border border-gray-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                          {response.field?.label || 'Field'}
                        </p>
                        <p className="mt-2 text-sm font-medium text-gray-900 break-words">
                          {response.value || 'No answer'}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {response.field?.field_type || 'unknown field type'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No local registration responses were found for this payment.</p>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">Sync Hub Record</p>
                <KeyValueList
                  items={[
                    { label: 'Sync Hub ID', value: local?.syncHubRecord?.id || 'Not available' },
                    { label: 'Sync Status', value: local?.syncHubRecord?.status || 'Not available' },
                    { label: 'Reconciled', value: String(local?.syncHubRecord?.reconciled ?? false) },
                    { label: 'Synced At', value: formatDate(local?.syncHubRecord?.synced_at) },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">Metadata</CardTitle>
              <CardDescription>
                Payment notes, order notes, and the merged metadata snapshot used for this lookup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-3 text-sm font-semibold text-gray-900">Payment Notes</p>
                <JsonBlock value={result.metadata?.paymentNotes} emptyLabel="Payment notes not present." />
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-gray-900">Order Notes</p>
                <JsonBlock value={result.metadata?.orderNotes} emptyLabel="Order notes not present." />
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-gray-900">Merged Metadata</p>
                <JsonBlock value={result.metadata?.mergedNotes} emptyLabel="Merged metadata not present." />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">Refund Check</CardTitle>
              <CardDescription>
                Refund information returned by Razorpay for this payment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <KeyValueList
                items={[
                  { label: 'Razorpay Refund Made', value: result.refunds?.razorpayRefundMade ? 'Yes' : 'No' },
                  { label: 'Refund Count', value: String(result.refunds?.refundCount ?? 0) },
                  {
                    label: 'Total Refunded Amount',
                    value: formatCurrency(result.refunds?.totalRefundedAmount, result.summary?.currency || 'INR'),
                  },
                  { label: 'Latest Refund At', value: formatDate(result.refunds?.latestRefundAt) },
                ]}
              />

              {result.refunds?.refundCheckError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {result.refunds.refundCheckError}
                </div>
              )}

              {Array.isArray(result.refunds?.refunds) && result.refunds.refunds.length > 0 ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {result.refunds.refunds.map((refund: any) => (
                    <div key={refund.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900">{refund.id}</p>
                        <Badge className="bg-slate-900 text-white">{String(refund.status || 'unknown').toUpperCase()}</Badge>
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-gray-600">
                        <p>Amount: {formatCurrency(refund.amount, refund.currency || result.summary?.currency || 'INR')}</p>
                        <p>Created: {formatDate(refund.created_at)}</p>
                        <p>Receipt: {refund.receipt || 'Not available'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No Razorpay refunds were returned for this payment.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                <FileJson className="h-5 w-5" />
                Raw Razorpay Payload
              </CardTitle>
              <CardDescription>
                Full live Razorpay response for the payment and its linked order.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <details open className="rounded-xl border border-gray-200 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-gray-900">Payment JSON</summary>
                <div className="mt-4">
                  <JsonBlock value={result.raw?.payment} />
                </div>
              </details>

              <details className="rounded-xl border border-gray-200 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-gray-900">Order JSON</summary>
                <div className="mt-4">
                  <JsonBlock value={result.raw?.order} emptyLabel="Order payload not available." />
                </div>
              </details>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
