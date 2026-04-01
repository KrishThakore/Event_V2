'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  User, 
  Calendar, 
  CreditCard,
  CheckSquare,
  Square,
  Search,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice } from '@/lib/currency';

const SCAN_OPTIONS = [
  { value: 100, label: 'Last 100' },
  { value: 300, label: 'Last 300' },
  { value: 500, label: 'Last 500' },
  { value: 1000, label: 'Last 1000' },
  { value: 2000, label: 'Last 2000' },
  { value: 5000, label: 'Last 5000 (Safe Scan)' },
  { value: 10000, label: 'Last 10,000 (Full History)' },
  { value: 50000, label: 'Last 50,000 (Max Deep Scan)' },
] as const;

interface Discrepancy {
  payment_id: string;
  order_id: string;
  amount: number;
  currency: string;
  created_at: string;
  registration_id: string;
  event_title: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  method: string;
  status: string;
  vpa?: string;
  upi_rrn?: string;
  bank_tid?: string;
  bank?: string;
  wallet?: string;
}

function getReferenceLabel(discrepancy: Discrepancy) {
  if (discrepancy.method === 'upi') {
    return discrepancy.vpa || discrepancy.upi_rrn
      ? 'UPI payment with Razorpay reference'
      : 'UPI payment, reference not returned';
  }

  if (discrepancy.method === 'card') {
    return discrepancy.bank_tid
      ? 'Card payment with bank transaction reference'
      : 'Card payment, bank reference not returned';
  }

  if (discrepancy.method === 'netbanking') {
    return discrepancy.bank
      ? `Netbanking via ${discrepancy.bank}`
      : 'Netbanking payment';
  }

  if (discrepancy.method === 'wallet') {
    return discrepancy.wallet
      ? `Wallet payment via ${discrepancy.wallet}`
      : 'Wallet payment';
  }

  return `${discrepancy.method || 'unknown'} payment`;
}

async function parseApiResponse(res: Response) {
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (isJson) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Server returned invalid JSON.');
    }
  }

  if (!res.ok) {
    if (text.includes('<html') || text.includes('<!DOCTYPE')) {
      throw new Error(`Server returned ${res.status}. This usually means the live scan timed out before the API could respond.`);
    }

    throw new Error(text || `Request failed with status ${res.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Server returned an unexpected response.');
  }
}

export default function ReconciliationClient() {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scanLimit, setScanLimit] = useState<number>(300);
  const [lastRequestedScanLimit, setLastRequestedScanLimit] = useState<number>(300);
  const [actualScannedCount, setActualScannedCount] = useState<number>(0);

  useEffect(() => {
    const storedLimit = window.localStorage.getItem('razorpay-sync-scan-limit');
    const storedRequestedScanLimit = window.localStorage.getItem('razorpay-sync-last-requested-scan-limit');
    const storedActualScannedCount = window.localStorage.getItem('razorpay-sync-actual-scanned-count');

    if (storedLimit) {
      const parsedLimit = Number(storedLimit);
      if (SCAN_OPTIONS.some((option) => option.value === parsedLimit)) {
        setScanLimit(parsedLimit);
      }
    }

    if (storedRequestedScanLimit) {
      const parsedRequestedLimit = Number(storedRequestedScanLimit);
      if (SCAN_OPTIONS.some((option) => option.value === parsedRequestedLimit)) {
        setLastRequestedScanLimit(parsedRequestedLimit);
      }
    }

    if (storedActualScannedCount) {
      const parsedCount = Number(storedActualScannedCount);
      if (Number.isFinite(parsedCount) && parsedCount >= 0) {
        setActualScannedCount(parsedCount);
      }
    }

    void loadPersistedDiscrepancies();
  }, []);

  useEffect(() => {
    window.localStorage.setItem('razorpay-sync-scan-limit', String(scanLimit));
  }, [scanLimit]);

  useEffect(() => {
    window.localStorage.setItem('razorpay-sync-last-requested-scan-limit', String(lastRequestedScanLimit));
  }, [lastRequestedScanLimit]);

  useEffect(() => {
    window.localStorage.setItem('razorpay-sync-actual-scanned-count', String(actualScannedCount));
  }, [actualScannedCount]);

  async function loadPersistedDiscrepancies() {
    try {
      const res = await fetch('/api/admin/razorpay/discrepancies', { method: 'GET', cache: 'no-store' });
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load stored discrepancies');
      setDiscrepancies(data.discrepancies || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load stored discrepancies');
    }
  }

  async function fetchDiscrepancies() {
    setLoading(true);
    setSelectedIds([]);
    const toastId = toast.loading(`Scanning the last ${scanLimit.toLocaleString('en-IN')} Razorpay entries...`);
    try {
      let totalScannedCount = 0;
      let nextSkip = 0;
      let completed = false;
      let nextDiscrepancies: Discrepancy[] = [];

      while (!completed) {
        const res = await fetch('/api/admin/razorpay/discrepancies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scanLimit, startSkip: nextSkip }),
        });
        const data = await parseApiResponse(res);
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch');

        totalScannedCount += Number(data.chunkScannedCount || 0);
        nextSkip = Number(data.nextSkip || nextSkip);
        completed = Boolean(data.completed);
        setActualScannedCount(totalScannedCount);

        if (completed) {
          nextDiscrepancies = data.discrepancies || [];
          setLastRequestedScanLimit(data.requestedScanLimit || scanLimit);
        }
      }

      setDiscrepancies(nextDiscrepancies);
      if (nextDiscrepancies.length > 0) {
        toast.success(`Stored ${nextDiscrepancies.length} unresolved discrepancies after scanning ${totalScannedCount.toLocaleString('en-IN')} Razorpay entries.`, { id: toastId });
      } else {
        toast.success('No unresolved discrepancies found. Stored results are clean.', { id: toastId });
      }
    } catch (error: any) {
      toast.error(error.message || 'Search failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  async function validateDiscrepancies() {
    setValidating(true);
    setSelectedIds([]);
    const toastId = toast.loading('Validating stored discrepancies against live Razorpay data...');
    try {
      const res = await fetch('/api/admin/razorpay/discrepancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate' }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'Validation failed');

      const nextDiscrepancies = data.discrepancies || [];
      const validatedCount = Number(data.validationSummary?.validatedCount || 0);
      const removedCount = Number(data.validationSummary?.removedCount || 0);

      setDiscrepancies(nextDiscrepancies);

      toast.success(
        `Validated ${validatedCount.toLocaleString('en-IN')} stored entries. Removed ${removedCount.toLocaleString('en-IN')} non-real discrepancies.`,
        { id: toastId }
      );
    } catch (error: any) {
      toast.error(error.message || 'Validation failed', { id: toastId });
    } finally {
      setValidating(false);
    }
  }

  function downloadStoredDiscrepancies() {
    if (discrepancies.length === 0) {
      toast.error('There are no stored discrepancies to download.');
      return;
    }

    const headers = [
      'Event Title',
      'User Name',
      'User Email',
      'Mobile Number',
      'Amount',
      'Currency',
      'Created At',
      'Payment Method',
      'Razorpay Status',
      'Reference Summary',
      'UPI ID',
      'RRN / Trans ID',
      'Bank TID',
      'Bank',
      'Wallet',
      'Razorpay Payment ID',
      'Razorpay Order ID',
      'Registration ID',
    ];

    const escapeCsv = (value: unknown) => {
      const stringValue = String(value ?? '');
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const rows = discrepancies.map((d) => [
      d.event_title,
      d.user_name,
      d.user_email,
      d.user_phone || '',
      d.amount,
      d.currency,
      new Date(d.created_at).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      d.method,
      d.status,
      getReferenceLabel(d),
      d.vpa || '',
      d.upi_rrn || '',
      d.bank_tid || '',
      d.bank || '',
      d.wallet || '',
      d.payment_id,
      d.order_id || '',
      d.registration_id,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `razorpay-sync-hub-discrepancies-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${discrepancies.length} stored discrepancies.`);
  }

  async function handleAction(ids: string[], action: 'confirm' | 'reject') {
    if (ids.length === 0) return;
    
    const confirmMsg = action === 'confirm' 
      ? `Are you sure you want to CONFIRM ${ids.length} registration(s)?` 
      : `Are you sure you want to REJECT ${ids.length} registration(s)? This will keep them as pending/rejected but acknowledge the payment.`;
    
    if (!confirm(confirmMsg)) return;

    setProcessing(true);
    const toastId = toast.loading(`${action === 'confirm' ? 'Confirming' : 'Rejecting'} registrations...`);
    try {
      const res = await fetch('/api/admin/razorpay/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_ids: ids, action })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Action failed');

      toast.success(`${data.summary.processed} registrations ${action === 'confirm' ? 'confirmed' : 'rejected'} successfully!`, { 
        id: toastId,
        description: data.summary.errors > 0 ? `${data.summary.errors} errors occurred.` : undefined
      });
      
      // Update local state by removing processed items
      setDiscrepancies(prev => prev.filter(d => !ids.includes(d.payment_id)));
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } catch (error: any) {
      toast.error(error.message || 'Action failed', { id: toastId });
    } finally {
      setProcessing(false);
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === discrepancies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(discrepancies.map(d => d.payment_id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="grid gap-8 bg-white p-8 rounded-[2.5rem] shadow-xl shadow-purple-100/50 border border-purple-50 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] xl:items-end">
        <div className="space-y-5">
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 px-4 py-1 rounded-full font-bold border-none mb-2">
            Admin Tool
          </Badge>
          <div className="max-w-2xl space-y-3">
            <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">Razorpay Sync Hub</h1>
            <p className="max-w-xl text-base font-medium leading-7 text-gray-600">
              Identify and store registrations where payment was successful in Razorpay but status remained pending in your system.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <span className="rounded-3xl bg-gray-100 px-4 py-3 text-gray-700">
              <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Stored unresolved</span>
              <span className="mt-1 block text-2xl font-black text-gray-900">{discrepancies.length}</span>
            </span>
            <span className="rounded-3xl bg-purple-50 px-4 py-3 text-purple-700">
              <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-purple-400">Last scan option</span>
              <span className="mt-1 block text-2xl font-black text-purple-700">{lastRequestedScanLimit.toLocaleString('en-IN')}</span>
            </span>
            <span className="rounded-3xl bg-blue-50 px-4 py-3 text-blue-700">
              <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-blue-400">Actual scanned</span>
              <span className="mt-1 block text-2xl font-black text-blue-700">{actualScannedCount.toLocaleString('en-IN')}</span>
            </span>
          </div>
        </div>
        <div className="space-y-4 xl:justify-self-end xl:w-full xl:max-w-3xl">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <div className="grid gap-4 2xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] 2xl:items-end">
              <div className="flex flex-col gap-2 text-sm font-bold text-gray-600">
                <span>Scan Depth</span>
                <Select
                  value={String(scanLimit)}
                  onValueChange={(value) => setScanLimit(Number(value))}
                  disabled={loading || processing || validating}
                >
                  <SelectTrigger
                    className="h-14 w-full rounded-2xl border border-slate-500/40 bg-slate-700 px-5 text-base font-semibold text-white shadow-[0_18px_45px_-22px_rgba(91,33,182,0.45)] transition hover:border-purple-300/60 hover:bg-slate-700 focus:ring-purple-300/50"
                  >
                    <SelectValue placeholder="Select scan depth" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[320px] rounded-2xl border border-slate-500/30 bg-slate-800 p-2 text-white shadow-[0_24px_80px_-28px_rgba(15,23,42,0.85)]">
                    {SCAN_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={String(option.value)}
                        className="rounded-xl py-3 pl-8 pr-3 text-sm font-semibold text-white focus:bg-slate-700 focus:text-white data-[state=checked]:bg-purple-500/35 data-[state=checked]:text-white"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 2xl:grid-cols-2">
                <Button 
                  onClick={fetchDiscrepancies} 
                  disabled={loading || processing || validating}
                  className="h-14 w-full justify-center whitespace-normal px-6 text-center bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl shadow-lg shadow-purple-200 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-6 h-6 mr-3 animate-spin" /> : <RefreshCw className="w-6 h-6 mr-3" />}
                  Check for Discrepancies
                </Button>
                <Button
                  onClick={validateDiscrepancies}
                  disabled={loading || processing || validating}
                  variant="outline"
                  className="h-14 w-full justify-center whitespace-normal px-6 text-center border-sky-200 text-sky-700 hover:bg-sky-50 font-black rounded-2xl shadow-sm disabled:opacity-50"
                >
                  {validating ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <ShieldCheck className="w-5 h-5 mr-3" />}
                  Validate Stored
                </Button>
                <Button
                  onClick={downloadStoredDiscrepancies}
                  disabled={loading || processing || validating || discrepancies.length === 0}
                  variant="outline"
                  className="h-14 w-full justify-center whitespace-normal px-6 text-center border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-black rounded-2xl shadow-sm disabled:opacity-50 2xl:col-span-2"
                >
                  Download Stored
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-semibold text-gray-500">
            <span className="rounded-full bg-gray-100 px-4 py-2 text-gray-700">Saved list survives refresh</span>
            <span className="rounded-full bg-amber-50 px-4 py-2 text-amber-700">Validate clears stale false positives</span>
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-emerald-700">CSV download includes phone and references</span>
          </div>
        </div>
      </div>

      {discrepancies.length > 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Multi-Action Toolbar */}
          <div className="sticky top-6 z-30 bg-white/80 backdrop-blur-xl border border-gray-100 p-4 rounded-3xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={toggleSelectAll}
                className="hover:bg-purple-50 text-gray-700 font-bold px-4"
              >
                {selectedIds.length === discrepancies.length ? (
                  <CheckSquare className="w-5 h-5 mr-2 text-purple-600" />
                ) : (
                  <Square className="w-5 h-5 mr-2 text-gray-400" />
                )}
                {selectedIds.length === discrepancies.length ? 'Deselect All' : 'Select All'}
              </Button>
              <div className="h-6 w-px bg-gray-200 hidden sm:block" />
              <p className="text-sm font-bold text-gray-500">
                <span className="text-purple-600">{selectedIds.length}</span> of {discrepancies.length} items selected
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleAction(selectedIds, 'confirm')}
                disabled={selectedIds.length === 0 || processing || validating}
                className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md disabled:hidden"
              >
                Confirm Selected
              </Button>
              <Button
                onClick={() => handleAction(selectedIds, 'reject')}
                disabled={selectedIds.length === 0 || processing || validating}
                variant="outline"
                className="border-red-100 text-red-600 hover:bg-red-50 font-bold rounded-xl disabled:hidden"
              >
                Reject Selected
              </Button>
              <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block" />
              <Button
                onClick={() => handleAction(discrepancies.map(d => d.payment_id), 'confirm')}
                disabled={processing || validating}
                variant="outline"
                className="border-green-100 text-green-700 hover:bg-green-50 font-bold rounded-xl"
              >
                Confirm All ({discrepancies.length})
              </Button>
              <Button
                onClick={() => handleAction(discrepancies.map(d => d.payment_id), 'reject')}
                disabled={processing || validating}
                variant="ghost"
                className="text-red-400 hover:text-red-600 hover:bg-red-50 font-bold rounded-xl"
              >
                Reject All
              </Button>
            </div>
          </div>

          {/* List Section */}
          <div className="grid grid-cols-1 gap-4">
            {discrepancies.map((d) => (
              <Card 
                key={d.payment_id} 
                className={`group border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden ${
                  selectedIds.includes(d.payment_id) ? 'ring-2 ring-purple-500 bg-purple-50/20' : 'bg-white'
                }`}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row items-stretch">
                    {/* Selector */}
                    <div 
                      onClick={() => toggleSelect(d.payment_id)}
                      className="w-12 sm:w-16 flex items-center justify-center cursor-pointer hover:bg-purple-100/50 transition-colors border-r border-gray-50"
                    >
                      <Checkbox 
                        checked={selectedIds.includes(d.payment_id)} 
                        className="w-6 h-6 rounded-lg pointer-events-none"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black text-gray-900 leading-tight">{d.event_title}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                            <div className="flex items-center gap-1.5 font-bold text-gray-700">
                              <User className="w-4 h-4 text-purple-400" />
                              {d.user_name}
                              <span className="text-gray-400 font-medium">({d.user_email})</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                              <span className="text-gray-400">Mobile:</span>
                              <span>{d.user_phone || 'Not available'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {new Date(d.created_at).toLocaleString('en-IN', { 
                                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-lg font-black px-4 py-1.5 rounded-2xl bg-green-50 text-green-700 border-green-100 shadow-sm">
                            {formatPrice(d.amount, d.currency)}
                          </Badge>
                          <div className="mt-2 flex flex-col items-end gap-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d.method} Payment</p>
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">
                              Razorpay {d.status}
                            </Badge>
                            <p className="max-w-xs text-right text-[11px] font-semibold text-slate-500">
                              {getReferenceLabel(d)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-50">
                         <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-bold text-gray-600 uppercase tracking-tighter">Pay ID: {d.payment_id}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                          <Search className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-bold text-gray-600 uppercase tracking-tighter">Ord ID: {d.order_id}</span>
                        </div>
                        
                        {/* Advanced Transaction Details */}
                        {d.vpa && (
                          <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100">
                            <span className="text-[10px] font-black text-purple-400 uppercase">UPI ID</span>
                            <span className="text-xs font-bold text-purple-700">{d.vpa}</span>
                          </div>
                        )}
                        {d.upi_rrn && (
                          <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                            <span className="text-[10px] font-black text-green-400 uppercase">RRN/Trans ID</span>
                            <span className="text-xs font-bold text-green-700">{d.upi_rrn}</span>
                          </div>
                        )}
                        {d.bank_tid && (
                          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                            <span className="text-[10px] font-black text-blue-400 uppercase">Bank TID</span>
                            <span className="text-xs font-bold text-blue-700">{d.bank_tid}</span>
                          </div>
                        )}
                        {(d.bank || d.wallet) && (
                          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase">{d.bank ? 'Bank' : 'Wallet'}</span>
                            <span className="text-xs font-bold text-gray-600">{d.bank || d.wallet}</span>
                          </div>
                        )}
                        {!d.vpa && !d.upi_rrn && !d.bank_tid && (
                          <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-amber-700">
                              Extra transaction refs were not returned by Razorpay for this payment method.
                            </span>
                          </div>
                        )}
                        <a 
                          href={`https://dashboard.razorpay.com/app/payments/${d.payment_id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1 ml-auto transition-colors"
                        >
                          View in Razorpay <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Side Action (Desktop) */}
                    <div className="hidden xl:flex flex-col gap-px border-l border-gray-50">
                      <button 
                        onClick={() => handleAction([d.payment_id], 'confirm')}
                        disabled={processing || validating}
                        className="flex-1 px-8 bg-green-50 text-green-700 hover:bg-green-100 transition-all flex flex-col items-center justify-center gap-2 border-b border-gray-50"
                      >
                        <CheckCircle className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Confirm</span>
                      </button>
                      <button 
                         onClick={() => handleAction([d.payment_id], 'reject')}
                         disabled={processing || validating}
                         className="flex-1 px-8 bg-red-50 text-red-700 hover:bg-red-100 transition-all flex flex-col items-center justify-center gap-2"
                      >
                        <XCircle className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Reject</span>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State / Initial State */}
      {!loading && discrepancies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center bg-white rounded-[3rem] shadow-xl shadow-gray-100/50 border border-gray-100/50">
          <div className="w-32 h-32 bg-purple-50 rounded-[2.5rem] flex items-center justify-center mb-8 relative">
            <div className="absolute inset-0 bg-purple-400 opacity-20 blur-2xl rounded-full" />
            <Search className="w-16 h-16 text-purple-600 relative z-10" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Ready to sync?</h2>
          <p className="text-gray-500 max-w-sm mb-10 font-medium text-lg leading-relaxed">
            Stored discrepancy results will stay here after refresh. Run a scan whenever you want to merge newer Razorpay captures into the saved list.
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Safe & Secure</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                <RefreshCw className="w-6 h-6" />
              </div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Real-time Data</p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-32 space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <div className="absolute left-1/2 top-1/2 w-36 -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-sm leading-5 text-purple-600 font-bold animate-pulse">
                Scanning up to {scanLimit.toLocaleString('en-IN')} Razorpay entries...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
