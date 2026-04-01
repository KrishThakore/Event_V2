'use client';

import { useState, useCallback } from 'react';
import { Search, XCircle, User, Mail, Clock, Ticket, QrCode, UserCheck, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Pagination from '@/components/Pagination';
import { formatDateIST } from '@/lib/date';
import { toast } from 'sonner';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const QRModalButton = dynamic(() => import('@/components/QRModalButton'), { ssr: false });

interface AttendanceClientProps {
  activeList: any[];
  totalPresent: number;
  totalAbsent: number;
  eventStats: any[];
  currentPage: number;
  activeTab: string;
  selectedEventId: string | null;
  selectedEventName: string | null;
}

export default function AttendanceClient({ 
  activeList, 
  totalPresent, 
  totalAbsent, 
  eventStats, 
  currentPage,
  activeTab,
  selectedEventId, 
  selectedEventName 
}: AttendanceClientProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 15;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalItems = activeTab === 'present' ? totalPresent : totalAbsent;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    if (!updates.page) params.delete('page');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleCheckin = async (method: string, registrationId?: string, entryCode?: string) => {
    const targetId = registrationId || entryCode || 'manual';
    const toastId = toast.loading('Processing check-in...');
    setLoadingAction(targetId);

    try {
      const response = await fetch('/api/organizer/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: method === 'code' ? 'checkin_by_code' : 'checkin', 
          registrationId, 
          entryCode 
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Check-in failed');

      toast.success('Successfully checked in!', { id: toastId });
      router.refresh();
      if (method === 'code') {
        const form = document.getElementById('manual-entry-form') as HTMLFormElement;
        if (form) form.reset();
      }
    } catch (error: any) {
      toast.error(error.message || 'Check-in failed', { id: toastId });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    updateFilters({ search, page: null });
  };

  return (
    <div className="space-y-8">
      {/* Statistics Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <div className="w-2 h-6 bg-purple-600 rounded-full" />
          Attendance Statistics
        </h2>
        {eventStats.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500 text-sm italic border border-dashed border-gray-200">
            No confirmed registrations found for current selection.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {eventStats.map((stats: any) => {
              const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
              return (
                <div key={stats.id} className="relative group rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:shadow-lg hover:shadow-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 line-clamp-1">{stats.title}</h3>
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Attendance</p>
                      <div className="text-2xl font-black text-gray-900">
                        {stats.present}<span className="text-xs text-gray-400 font-medium"> / {stats.total}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-none font-bold">
                      {pct}%
                    </Badge>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-600 transition-all duration-1000" 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Check-in Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <div className="w-2 h-6 bg-purple-600 rounded-full" />
          Rapid Attendance Tool
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Method A: Entry Code / Scanner</h3>
            <form 
              id="manual-entry-form"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCheckin('code', undefined, formData.get('entryCode') as string);
              }} 
              className="flex gap-2"
            >
              <Input name="entryCode" placeholder="Enter or scan entry code..." className="h-[52px] bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:bg-white transition-all outline-none" required />
              <Button type="submit" disabled={!!loadingAction} className="bg-gray-900 hover:bg-black text-white px-8 h-[52px] rounded-xl font-bold shadow-lg shadow-gray-200 transition-all active:scale-95">
                Check In
              </Button>
            </form>
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Method B: Visual QR Scanner</h3>
            <QRModalButton eventId={selectedEventId} buttonLabel="Open Camera QR Scanner" className="w-full rounded-xl bg-purple-600 h-[52px] text-sm font-bold text-white hover:bg-purple-700 shadow-lg shadow-purple-100 transition-all active:scale-95" />
          </div>
        </div>
      </div>

      {/* Search and Tabs Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex bg-gray-100/80 p-1 rounded-2xl w-full md:w-[400px]">
          <button
            onClick={() => updateFilters({ tab: 'absent', page: null })}
            className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'absent'
                ? "bg-white text-gray-900 shadow-sm scale-[1.02]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Not Checked In
            <Badge variant="secondary" className={`ml-2 border-none ${activeTab === 'absent' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200/50 text-gray-700'}`}>
              {totalAbsent}
            </Badge>
          </button>
          <button
            onClick={() => updateFilters({ tab: 'present', page: null })}
            className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'present'
                ? "bg-white text-gray-900 shadow-sm scale-[1.02]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Checked In
            <Badge variant="secondary" className={`ml-2 border-none ${activeTab === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200/50 text-gray-700'}`}>
              {totalPresent}
            </Badge>
          </button>
        </div>

        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            name="search"
            placeholder="Search attendees..."
            className="pl-10 h-11 bg-gray-50 border-gray-200 rounded-xl focus:ring-purple-500/20"
            defaultValue={searchParams.get('search') ?? ''}
          />
          <button type="submit" className="hidden" />
        </form>
      </div>

      {/* Main List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {activeList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6">
              <Ticket className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No participants found</h3>
            <p className="text-gray-500 max-w-sm mx-auto mt-2">
              {searchParams.get('search')
                ? `We couldn't find any results for "${searchParams.get('search')}" in this section.`
                : activeTab === 'absent' 
                  ? "All confirmed registrations are already checked in." 
                  : "No check-ins recorded yet for these events."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400">Participant</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400">Event</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400">Entry Code</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400">
                    {activeTab === 'present' ? 'Check-in Time' : 'Status'}
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-widest text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeList.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 border border-white flex items-center justify-center text-gray-500 shrink-0 shadow-sm">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                            {item.user?.full_name || 'Guest User'}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail className="w-3.5 h-3.5" />
                            {item.user?.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.event?.title}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">
                          {item.event?.event_date ? formatDateIST(item.event.event_date) : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-[11px] font-black text-purple-600 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-lg">
                        {item.entry_code || 'N/A'}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      {activeTab === 'present' ? (
                        <div className="flex flex-col">
                          <Badge className="w-fit bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px] gap-1.5 py-1 px-3">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            CHECKED IN
                          </Badge>
                          <span className="text-[10px] text-gray-400 mt-2 font-medium flex items-center gap-1.5 ml-1">
                            <Clock className="w-3.5 h-3.5" />
                            {item.attendance?.checked_in_at ? new Date(item.attendance.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                          </span>
                        </div>
                      ) : (
                        <Badge className="w-fit bg-amber-50 text-amber-700 border-amber-100 font-bold text-[10px] gap-1.5 py-1 px-3">
                          <XCircle className="w-3.5 h-3.5" />
                          AWAITING ENTRY
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {activeTab === 'absent' ? (
                        <Button 
                          onClick={() => handleCheckin('direct', item.id)} 
                          disabled={!!loadingAction}
                          className="bg-gray-900 hover:bg-black text-white rounded-xl h-10 px-5 text-xs font-bold shadow-lg shadow-gray-200 transition-all active:scale-95"
                        >
                          {loadingAction === item.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5 mr-2" />
                              Check In
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest px-4">Recorded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          className="mt-6"
        />
      )}
    </div>
  );
}
