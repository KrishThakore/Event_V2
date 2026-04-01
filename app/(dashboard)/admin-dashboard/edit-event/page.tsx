'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Calendar, MapPin, Users, Edit } from 'lucide-react';
import Link from 'next/link';
import Pagination from '@/components/Pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateIST, formatTimeIST } from '@/lib/date';
import { formatPrice } from '@/lib/currency';
import { parseEventImages } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  capacity: number;
  price: number;
  image_url?: string;
  currency?: string;
  status: 'approved' | 'draft' | 'pending_approval' | 'cancelled' | 'published';
  registration_deadline?: string;
  assigned_organizer: string | null;
  created_at: string;
  updated_at: string;
  form_fields?: any[];
}

interface EventCardProps {
  event: Event;
  onEdit: (eventId: string) => void;
  editingId: string | null;
}

function EventCard({ event, onEdit, editingId }: EventCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'approved':
      case 'published': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'pending_approval': return 'Pending Approval';
      case 'approved':
      case 'published': return 'Published';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const { coverUrl } = parseEventImages(event.image_url);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
            {coverUrl ? (
              <>
                <img src={coverUrl} alt={event.title} className="w-full h-full object-cover"
                  onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; const p = t.nextElementSibling as HTMLElement; if (p) p.classList.remove('hidden'); }}
                />
                <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center hidden"><Calendar className="w-8 h-8 text-purple-400" /></div>
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center"><Calendar className="w-8 h-8 text-purple-400" /></div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{event.title}</h3>
          <div className="mt-1 space-y-1">
            <div className="flex items-center text-sm text-gray-500"><Calendar className="w-4 h-4 mr-1" />{formatDateIST(event.event_date)} • {formatTimeIST(event.start_time)} - {formatTimeIST(event.end_time)}</div>
            <div className="flex items-center text-sm text-gray-500"><MapPin className="w-4 h-4 mr-1" />{event.location || 'No location specified'}</div>
            <div className="flex items-center text-sm text-gray-500"><Users className="w-4 h-4 mr-1" />{event.capacity} participants • {event.price > 0 ? formatPrice(event.price, event.currency || 'INR') : 'Free'}</div>
            <div className="flex items-center mt-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(event.status)}`}>{getStatusText(event.status)}</span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Button size="sm" onClick={() => onEdit(event.id)} disabled={editingId === event.id} className="bg-purple-600 text-white hover:bg-purple-700">
            {editingId === event.id ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Loading...</> : <><Edit className="h-3 w-3 mr-1" />Edit</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EditEventPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const resp = await fetch('/api/admin/events-list');
        if (!resp.ok) throw new Error('Failed to load events');
        const data = await resp.json();
        setEvents(data.events ?? []);
      } catch (err) {
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleEventSelect = (eventId: string) => {
    setEditingId(eventId);
    router.push(`/admin-dashboard/events/${encodeURIComponent(eventId)}/edit`);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  if (error) return (
    <div className="container mx-auto py-8">
      <Card><CardContent className="pt-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/admin-dashboard/events"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back to Events</Button></Link>
        </div>
      </CardContent></Card>
    </div>
  );

  if (events.length === 0) return (
    <div className="container mx-auto py-8">
      <Card><CardContent className="pt-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-600 mb-4">No Events Found</h2>
          <p className="text-gray-500 mb-4">Create an event first before you can edit it.</p>
          <Link href="/admin-dashboard/create-event"><Button>Create Event</Button></Link>
        </div>
      </CardContent></Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
          <p className="mt-1 text-sm text-gray-500">Select an event to edit its details</p>
        </div>
        <Link href="/admin-dashboard/events"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back to Events</Button></Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Edit className="h-5 w-5" />Select Event to Edit</CardTitle>
          <CardDescription>Choose an event from the list below to open the edit page</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleEventSelect}>
            <SelectTrigger className="w-48 border-gray-300 rounded-lg bg-white text-black"><SelectValue placeholder="Select an event to edit..." /></SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id} className="text-black hover:bg-gray-100">
                  <div className="flex flex-col items-start">
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(event.event_date).toLocaleDateString()}</div>
                      <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</div>
                      <div className="flex items-center gap-1"><Users className="h-3 w-3" />{event.capacity} seats</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {(() => {
          const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);
          const paginatedEvents = events.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
          return (<>
            {paginatedEvents.map((event) => <EventCard key={event.id} event={event} onEdit={handleEventSelect} editingId={editingId} />)}
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={events.length} itemsPerPage={ITEMS_PER_PAGE} />
          </>);
        })()}
      </div>
    </div>
  );
}
