'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, MoreVertical, Edit, Users, Trash2, Calendar, MapPin } from 'lucide-react';
import Pagination from '@/components/Pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateIST } from '@/lib/date';
import { parseEventImages } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Event {
  id: string;
  title: string;
  location: string;
  event_date: string;
  start_time: string;
  end_time: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'cancelled';
  visibility?: 'public' | 'hidden';
  created_by: string;
  assigned_organizer?: string;
  image_url?: string | null;
}

interface EventCardProps {
  event: Event;
  onDelete: (eventId: string) => void;
}

function EventCard({ event, onDelete }: EventCardProps) {
  const formatDate = (dateString: string) => {
    return formatDateIST(dateString);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'pending_approval':
        return 'Pending Approval';
      case 'approved':
      case 'published':
        return 'Published';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const canDelete = event.status === 'draft' || event.status === 'pending_approval';
  const { coverUrl } = parseEventImages(event.image_url);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Event Image */}
        <div className="flex-shrink-0 self-start">
          <div className="h-20 w-full max-w-[120px] bg-gray-200 rounded-lg overflow-hidden sm:w-20">
            {coverUrl ? (
              <img 
                src={coverUrl} 
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-purple-400" />
              </div>
            )}
          </div>
        </div>

        {/* Event Details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {event.title}
          </h3>
          <div className="mt-1 space-y-1">
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(event.event_date)}
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="w-4 h-4 mr-1" />
              {event.location || 'No location specified'}
            </div>
            <div className="flex items-center mt-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(event.status)}`}>
                {getStatusText(event.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Menu */}
        <div className="flex-shrink-0 self-end sm:self-start">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-gray-100 rounded-md">
                <MoreVertical className="w-5 h-5 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white !important border-gray-200 shadow-lg z-[9999]">
              <DropdownMenuItem asChild>
                <Link 
                  href={`/organizer-dashboard/events/${event.id}/edit`}
                  className="flex items-center gap-2 w-full px-2 py-2 text-gray-700 hover:bg-gray-100 focus:text-gray-900 focus:bg-gray-100 cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link 
                  href={`/organizer-dashboard/registrations?event_id=${event.id}`}
                  className="flex items-center gap-2 w-full px-2 py-2 text-gray-700 hover:bg-gray-100 focus:text-gray-900 focus:bg-gray-100 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  View Registrations
                </Link>
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(event.id)}
                    className="flex items-center gap-2 px-2 py-2 text-red-600 hover:bg-red-50 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

interface MyEventsClientProps {
  events: Event[];
  totalCount: number;
  currentPage: number;
}

export default function MyEventsClient({ events, totalCount, currentPage }: MyEventsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  
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

  const handleDelete = (eventId: string) => {
    setEventToDelete(eventId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;

    const toastId = toast.loading('Deleting event...');
    try {
      const response = await fetch(`/api/organizer/events/${eventToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }

      toast.success('Event deleted successfully', { id: toastId });
      router.refresh();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast.error(error.message || 'Failed to delete event', { id: toastId });
    } finally {
      setShowDeleteModal(false);
      setEventToDelete(null);
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    updateFilters({ search, page: null });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your events and registration activity at a glance
          </p>
        </div>
        <Link
          href="/organizer-dashboard/create-event"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Create Event
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            name="search"
            type="text"
            placeholder="Search events or locations..."
            defaultValue={searchParams.get('search') ?? ''}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
          />
          <button type="submit" className="hidden" />
        </form>

        <Select 
          value={searchParams.get('status') || 'all'} 
          onValueChange={(v) => updateFilters({ status: v, page: null })}
        >
          <SelectTrigger className="w-full min-w-[220px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-black sm:w-48">
            <SelectValue placeholder="All events" className="text-black" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
            <SelectItem value="all" className="text-black hover:bg-gray-100">All events</SelectItem>
            <SelectItem value="draft" className="text-black hover:bg-gray-100">Draft</SelectItem>
            <SelectItem value="pending_approval" className="text-black hover:bg-gray-100">Pending approval</SelectItem>
            <SelectItem value="approved" className="text-black hover:bg-gray-100">Approved / Published</SelectItem>
            <SelectItem value="cancelled" className="text-black hover:bg-gray-100">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {totalCount === 0 ? "You haven't created any events yet." : "No events match your filters."}
          </h3>
          <p className="text-gray-500 mb-4">
            {totalCount === 0 ? "Get started by creating your first event." : "Try adjusting your search or filter criteria."}
          </p>
          {totalCount === 0 && (
            <Link
              href="/organizer-dashboard/create-event"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create your first event
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onDelete={handleDelete} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCount}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-3xl max-w-[400px] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Delete Event?</DialogTitle>
            <DialogDescription className="text-gray-500 pt-2">
              This will permanently delete the draft event. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 pt-6 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 sm:flex-none h-11 rounded-xl border-gray-100 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="flex-1 sm:flex-none h-11 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
