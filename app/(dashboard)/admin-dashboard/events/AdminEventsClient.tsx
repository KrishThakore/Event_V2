'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, Filter, Grid3X3, List } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import AdminEventCard from './AdminEventCard';
import Pagination from '@/components/Pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface AdminEventsClientProps {
  initialEvents: any[];
  totalCount: number;
  currentPage: number;
}

export default function AdminEventsClient({ 
  initialEvents, 
  totalCount, 
  currentPage 
}: AdminEventsClientProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Load view mode preference
  useEffect(() => {
    const savedViewMode = localStorage.getItem('admin_events_view_mode');
    if (savedViewMode === 'grid' || savedViewMode === 'list') {
      setViewMode(savedViewMode);
    }
  }, []);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('admin_events_view_mode', viewMode);
  }, [viewMode]);

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

  async function handleEventAction(formData: FormData) {
    const action = formData.get('action') as string | null;
    const eventId = formData.get('eventId') as string | null;
    if (!action || !eventId) return;

    const actionLabels: Record<string, string> = {
      clone_event: 'Cloning event...',
      approve: 'Approving event...',
      cancel: 'Cancelling event...',
      delete: 'Deleting event...',
      open_reg: 'Opening registrations...',
      close_reg: 'Closing registrations...'
    };

    const toastId = toast.loading(actionLabels[action] || 'Processing action...');

    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, eventId })
      });
      if (res.ok) {
        toast.success('Action completed successfully', { id: toastId });
        router.refresh();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Event action failed', { id: toastId });
      }
    } catch (error) {
      console.error('Error handling event action:', error);
      toast.error('An unexpected error occurred', { id: toastId });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with search and controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">Events</h1>
          <p className="text-gray-600 mt-2">Manage events, approvals, registrations, and capacity.</p>
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Month dropdown */}
          <Select 
            value={searchParams.get('month') || 'all'} 
            onValueChange={(val) => updateFilters({ month: val, page: null })}
          >
            <SelectTrigger className="h-11 w-full bg-white border-gray-100 shadow-sm rounded-xl font-medium sm:w-36">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
            </SelectContent>
          </Select>

          {/* View mode buttons */}
          <div className="flex bg-gray-100/80 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              name="search"
              type="text"
              placeholder="Search events, location, organizer, or ID..."
              defaultValue={searchParams.get('search') ?? ''}
              className="pl-12 h-12 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-purple-500/20 transition-all font-medium"
            />
            <button type="submit" className="hidden" />
          </form>
        </CardContent>
      </Card>

      {/* Results summary */}
      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-gray-500 font-medium">
          Found <span className="text-gray-900 font-bold">{totalCount}</span> {totalCount === 1 ? 'event' : 'events'}
          {searchParams.get('search') && (
            <span className="ml-1 text-purple-600">matching "{searchParams.get('search')}"</span>
          )}
        </div>
      </div>

      {/* Events List */}
      {initialEvents.length === 0 ? (
        <Card className="bg-white border-dashed border-2 border-gray-100 shadow-none rounded-3xl">
          <CardContent className="p-16">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Filter className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No events found
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Try adjusting your search or filters to see more results from the event repository.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'flex flex-col gap-4'}>
            {initialEvents.map((event: any) => (
              <AdminEventCard key={event.id} event={event} onAction={handleEventAction} viewMode={viewMode} />
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
    </div>
  );
}
