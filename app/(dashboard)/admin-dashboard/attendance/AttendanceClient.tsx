'use client';

import { useCallback, useEffect } from 'react';
import { Search, CheckCircle2, XCircle, Undo2, User, Mail, Ticket, Clock, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Pagination from '@/components/Pagination';
import { formatDateIST } from '@/lib/date';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

interface AttendanceClientProps {
  activeList: any[];
  totalPresent: number;
  totalAbsent: number;
  currentPage: number;
  activeTab: string;
  onAction: (formData: FormData) => Promise<void>;
}

export default function AttendanceClient({ 
  activeList, 
  totalPresent, 
  totalAbsent, 
  currentPage, 
  activeTab, 
  onAction 
}: AttendanceClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ITEMS_PER_PAGE = 15;
  const totalItems = activeTab === 'present' ? totalPresent : totalAbsent;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  useEffect(() => {
    const attendanceStatus = searchParams.get('attendanceStatus');
    if (!attendanceStatus) return;

    if (attendanceStatus === 'checked_in') {
      toast.success('Attendance marked present successfully');
    } else if (attendanceStatus === 'already_checked_in') {
      toast.info('This attendee is already checked in');
    } else if (attendanceStatus === 'undo_success') {
      toast.success('Check-in was undone successfully');
    } else if (attendanceStatus === 'undo_noop') {
      toast.info('There was no check-in record to undo');
    } else if (attendanceStatus === 'not_found') {
      toast.error('Registration not found for this action');
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('attendanceStatus');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    if (!updates.page) params.delete('page');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    updateFilters({ search, page: null });
  };

  return (
    <div className="space-y-6">
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
            placeholder="Search by name, email, or entry code..."
            className="pl-10 h-11 bg-gray-50 border-gray-200 rounded-xl focus:ring-purple-500/20"
            defaultValue={searchParams.get('search') ?? ''}
          />
          <button type="submit" className="hidden" />
        </form>
      </div>

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
                  ? "Great news! Everyone registered has already checked in." 
                  : "No check-ins have been recorded yet for this selection."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400">Participant</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400">Event Details</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400">Entry Code</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400">
                    {activeTab === 'present' ? 'Check-in Time' : 'Attendance Status'}
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-widest text-gray-400">Quick Actions</th>
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
                            {item.user?.full_name || 'Unknown Participant'}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail className="w-3.5 h-3.5" />
                            {item.user?.email || 'No email provided'}
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
                      <form action={onAction}>
                        <input type="hidden" name="registrationId" value={item.id} />
                        <input type="hidden" name="event" value={searchParams.get('event') ?? 'all'} />
                        <input type="hidden" name="tab" value={searchParams.get('tab') ?? activeTab} />
                        <input type="hidden" name="search" value={searchParams.get('search') ?? ''} />
                        <input type="hidden" name="page" value={searchParams.get('page') ?? String(currentPage)} />
                        {activeTab === 'absent' ? (
                          <Button 
                            type="submit" 
                            name="action" 
                            value="checkin"
                            className="bg-gray-900 hover:bg-black text-white rounded-xl h-10 px-5 text-xs font-bold shadow-lg shadow-gray-200 transition-all active:scale-95"
                          >
                            Mark Present
                          </Button>
                        ) : (
                          <Button 
                            type="submit" 
                            name="action" 
                            value="undo"
                            variant="outline"
                            className="border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 rounded-xl h-10 px-5 text-xs font-bold transition-all active:scale-95"
                          >
                            <Undo2 className="w-3.5 h-3.5 mr-2" />
                            Undo Check-in
                          </Button>
                        )}
                      </form>
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
