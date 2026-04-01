'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Edit, Calendar, MapPin, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Event {
  id: string;
  title: string;
  location: string;
  event_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

export default function EditEventsDropdown() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/admin/events');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        
        // Match the structure from /api/admin/events
        const eventsList = (data.events || []).slice(0, 10).map((e: any) => ({
          id: e.id,
          title: e.title,
          location: e.location,
          event_date: e.event_date,
          start_time: e.start_time,
          end_time: e.end_time,
          status: e.status
        }));

        setEvents(eventsList);
      } catch (err) {
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-between rounded-md px-3 py-2 text-xs text-gray-500">
        <span>Loading events...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between rounded-md px-3 py-2 text-xs text-red-400">
        <span>Error loading events</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-md px-3 py-2 text-xs text-gray-500">
        <span>No events found</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center justify-between rounded-md px-3 py-2 text-xs text-gray-700 hover:bg-purple-100 hover:text-gray-900 w-full">
        <span>Edit Events</span>
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-white border-gray-200">
        <DropdownMenuLabel className="text-gray-700 text-xs font-semibold">
          Select Event to Edit
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-200" />
        
        {events.map((event) => (
          <DropdownMenuItem key={event.id} className="text-gray-700 hover:bg-purple-50 p-0">
            <Link
              href={`/admin-dashboard/events/${event.id}/edit`}
              className="flex items-start space-x-2 w-full p-2"
            >
              <Edit className="h-3 w-3 mt-0.5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-900 truncate">
                  {event.title}
                </div>
                <div className="flex items-center space-x-2 mt-1 text-[10px] text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-2.5 w-2.5" />
                    <span>{new Date(event.event_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-2.5 w-2.5" />
                    <span className="truncate max-w-[100px]">{event.location}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                    event.status === 'approved' ? 'bg-green-100 text-green-700' :
                    event.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                    event.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {event.status}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {event.start_time} - {event.end_time}
                  </span>
                </div>
              </div>
            </Link>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator className="bg-gray-200" />
        <DropdownMenuItem className="text-gray-500 hover:bg-purple-50">
          <Link
            href="/admin-dashboard/events"
            className="flex items-center space-x-2 w-full p-2"
          >
            <Users className="h-3 w-3" />
            <span className="text-xs">View All Events</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
