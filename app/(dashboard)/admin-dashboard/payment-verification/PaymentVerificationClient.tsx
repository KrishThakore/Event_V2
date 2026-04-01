'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/currency';
import { ShieldCheck, ShieldX, Clock, DollarSign, Image as ImageIcon, ExternalLink, User, Calendar, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Pagination from '@/components/Pagination';

interface VerificationRegistration {
  id: string;
  status: string;
  paid_amount: number;
  currency: string;
  payment_proof_url: string | null;
  verification_status: string | null;
  rejection_reason: string | null;
  created_at: string;
  event_title: string;
  event_id: string;
  user_name: string;
  user_email: string;
  pricing_option_label: string | null;
  pricing_option_price: number | null;
}

interface PaymentVerificationClientProps {
  registrations: VerificationRegistration[];
  role: 'admin' | 'organizer';
  totalCount: number;
  currentPage: number;
  pendingCount: number;
  rejectedCount: number;
}

export default function PaymentVerificationClient({ 
  registrations, 
  role,
  totalCount,
  currentPage,
  pendingCount,
  rejectedCount
}: PaymentVerificationClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [proofModal, setProofModal] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    if (!updates.page) params.delete('page');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  async function handleApprove(registrationId: string) {
    setProcessingId(registrationId);
    const toastId = toast.loading('Approving registration...');
    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: registrationId, action: 'approve' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to approve');

      toast.success('Registration approved and confirmed!', { id: toastId });
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve', { id: toastId });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(registrationId: string) {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingId(registrationId);
    const toastId = toast.loading('Rejecting registration...');
    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: registrationId, action: 'reject', reason: rejectReason })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to reject');

      toast.success('Registration rejected', { id: toastId });
      setRejectingId(null);
      setRejectReason('');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject', { id: toastId });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleSyncRazorpay() {
    setIsSyncing(true);
    const toastId = toast.loading('Syncing with Razorpay...');
    try {
      const res = await fetch('/api/admin/razorpay/sync', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Sync failed');

      const s = data.summary;
      toast.success(`Sync complete! ${s.reconciled} payments reconciled.`, { 
        id: toastId,
        description: `Checked ${s.total_checked} payments. ${s.reconciled} fixed, ${s.already_recorded} already ok.`
      });
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Sync failed', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  }

  const currentFilter = searchParams.get('filter') || 'all';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Payment Verification</h1>
          <p className="mt-2 text-gray-600">Review and verify payment proofs from registrations</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-amber-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-100 shadow-sm border border-amber-200">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-700">Pending</p>
              <p className="text-3xl font-black text-amber-900">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-red-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-red-100 shadow-sm border border-red-200">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700">Rejected</p>
              <p className="text-3xl font-black text-red-900">{rejectedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-blue-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-100 shadow-sm border border-blue-200">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-700">Displaying</p>
              <p className="text-3xl font-black text-blue-900">{totalCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => updateFilters({ filter: f, page: null })}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
              currentFilter === f
                ? 'bg-purple-600 text-white scale-105 shadow-purple-200'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Rejected'}
          </button>
        ))}
      </div>

      {/* Registrations List */}
      {registrations.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-100 shadow-none rounded-3xl">
          <CardContent className="p-16">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No registrations to verify</h3>
              <p className="text-gray-500 max-w-xs mx-auto">All payment verifications for this filter are up to date.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="space-y-4">
          {registrations.map((reg) => (
            <Card key={reg.id} className={`shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all border ${
              reg.status === 'REJECTED' ? 'border-red-100 bg-red-50/10' : 'border-gray-100 bg-white'
            }`}>
              <CardContent className="p-6">
                <div className="flex flex-col xl:flex-row gap-6">
                  {/* Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100 font-bold px-3">
                            {formatPrice(reg.paid_amount, reg.currency)}
                          </Badge>
                          <span className="font-bold text-gray-900 text-lg">{reg.event_title}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1.5 font-medium">
                            <User className="w-4 h-4 text-purple-400" />
                            <span className="text-gray-900">{reg.user_name}</span>
                            <span className="text-gray-400">({reg.user_email})</span>
                          </div>
                          {reg.pricing_option_label && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-none font-medium">
                              {reg.pricing_option_label}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1.5" suppressHydrationWarning>
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(reg.created_at).toLocaleDateString('en-IN', {
                              month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      <Badge className={`px-4 py-1 rounded-full font-bold shadow-sm ${
                        reg.status === 'PENDING_VERIFICATION'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {reg.status === 'PENDING_VERIFICATION' ? 'Pending Verification' : 'Rejected'}
                      </Badge>
                    </div>

                    {/* Rejection reason badge */}
                    {reg.status === 'REJECTED' && reg.rejection_reason && (
                      <div className="flex items-start gap-3 bg-red-50 rounded-2xl p-4 border border-red-100">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-black text-red-800 uppercase tracking-wider">Rejection Reason</p>
                          <p className="text-sm text-red-700 font-medium mt-1">{reg.rejection_reason}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment proof + actions */}
                  <div className="flex flex-col sm:flex-row xl:flex-col gap-3 xl:w-72">
                    {/* View payment proof */}
                    {reg.payment_proof_url && (
                      <Button
                        variant="outline"
                        onClick={() => setProofModal(reg.payment_proof_url)}
                        className="h-12 rounded-xl bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-bold w-full"
                      >
                        <ImageIcon className="w-4 h-4 mr-2 text-purple-500" />
                        View Payment Proof
                      </Button>
                    )}

                    {/* Actions for pending */}
                    {reg.status === 'PENDING_VERIFICATION' && (
                      <div className="w-full">
                        {rejectingId === reg.id ? (
                          <div className="space-y-3 p-1">
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Explain why the proof was rejected..."
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleReject(reg.id)}
                                disabled={processingId === reg.id || !rejectReason.trim()}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold h-11 rounded-xl flex-1 shadow-lg shadow-red-200"
                              >
                                {processingId === reg.id ? '...' : 'Reject'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                className="border-gray-200 rounded-xl h-11 px-4"
                              >
                                Back
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApprove(reg.id)}
                              disabled={processingId === reg.id}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 rounded-xl flex-1 shadow-lg shadow-purple-200 py-0"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {processingId === reg.id ? 'Processing...' : 'Approve'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setRejectingId(reg.id)}
                              disabled={processingId === reg.id}
                              className="border-red-100 text-red-600 hover:bg-red-50 font-bold h-12 rounded-xl flex-1 py-0"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {totalPages > 1 && (
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            totalItems={totalCount} 
            itemsPerPage={ITEMS_PER_PAGE} 
            className="mt-8"
          />
        )}
        </>
      )}

      {/* Payment Proof Modal */}
      {proofModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setProofModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-black text-gray-900 text-lg">Payment Proof Reference</h3>
              </div>
              <div className="flex gap-2">
                <a
                  href={proofModal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button 
                  onClick={() => setProofModal(null)} 
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 p-6 flex items-center justify-center">
              {proofModal.match(/\.(pdf)$/i) ? (
                <iframe src={proofModal} className="w-full h-full min-h-[70vh] rounded-xl shadow-inner border shadow-gray-200" />
              ) : (
                <img src={proofModal} alt="Payment proof" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain bg-white" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
