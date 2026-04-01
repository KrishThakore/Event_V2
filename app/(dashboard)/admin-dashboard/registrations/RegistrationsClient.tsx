'use client';

import { useEffect, useState } from 'react';
import { ViewTicketButton } from './ViewTicketButton';
import { Search, IndianRupee, DollarSign } from 'lucide-react';
import { formatPrice } from '@/lib/currency';

export default function RegistrationsClient({ events: initialEvents }: { events: any[] }) {
  const [regs, setRegs] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/all-registrations');
      if (!resp.ok) throw new Error('Failed to fetch');
      const data = await resp.json();
      setRegs(data.registrations ?? []);
      setFiltered(data.registrations ?? []);
    } catch (e) {
      console.error('Error fetching registrations (client):', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const term = q.trim().toLowerCase();
    if (term === '') { setFiltered(regs); return; }
    setFiltered(regs.filter(r =>
      (r.entry_code ?? '').toLowerCase().includes(term) ||
      (r.user?.full_name ?? '').toLowerCase().includes(term) ||
      (r.user?.email ?? '').toLowerCase().includes(term)
    ));
  }, [q, regs]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm text-gray-500 font-medium">Loading registrations...</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="relative flex-1 max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input type="text" name="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, or entry code"
          className="flex-1 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-sm text-gray-500 font-medium">No registrations found matching your search.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((reg: any) => (
            <div key={reg.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{reg.event?.title ?? 'Event'}</h2>
                  <div className="mb-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${reg.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : reg.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{reg.status}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">{reg.user?.full_name ?? 'User'}</span>
                    {' - '}<span>{reg.user?.email ?? 'No email'}</span>
                    {' - '}<span>Entry code: {reg.entry_code ?? 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="text-sm font-semibold text-gray-900 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 flex items-center gap-1.5">
                      {reg.currency === 'USD' ? <DollarSign className="w-3.5 h-3.5 text-blue-600" /> : <IndianRupee className="w-3.5 h-3.5 text-green-600" />}
                      {formatPrice(Number(reg.paid_amount || 0), reg.currency || 'INR')}
                    </div>
                    {reg.payment_method && (
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{reg.payment_method}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">Registered on {new Date(reg.created_at).toLocaleDateString('en-US')}</div>
                </div>
              </div>
              <div className="flex gap-3"><ViewTicketButton registration={reg} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
