'use client';

import { Calendar } from 'lucide-react';
import Link from 'next/link';
import './AdminEvents.css';
import { formatDateIST, formatTimeIST } from '@/lib/date';

import { parseEventImages } from '@/lib/utils';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AdminEventCardProps {
  event: any;
  onAction?: (formData: FormData) => void;
  viewMode?: 'grid' | 'list';
}

export default function AdminEventCard({ event, onAction, viewMode = 'list' }: AdminEventCardProps) {
  const isGridMode = viewMode === 'grid';
  const { coverUrl } = parseEventImages(event.image_url);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: string; label: string; color: string } | null>(null);

  const handleConfirmAction = (action: string, label: string, color: string) => {
    setPendingAction({ action, label, color });
    setConfirmOpen(true);
  };

  const executeAction = () => {
    if (!pendingAction || !onAction) return;
    const formData = new FormData();
    formData.append('eventId', event.id);
    formData.append('action', pendingAction.action);
    onAction(formData);
    setConfirmOpen(false);
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${
        isGridMode ? 'p-4' : 'p-6'
      }`}
    >
      {isGridMode ? (
        // Grid View Layout
        <div className="space-y-4">
          {/* Event Image */}
          <div className="event-image">
            {coverUrl ? (
              <>
                <img
                  src={coverUrl}
                  alt={event.title}
                  className="event-image-src image-content"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "fill",
                  }}
                  onLoad={() => {
                    console.log('✅ Admin: Image loaded successfully:', coverUrl);
                  }}
                  onError={(e) => {
                    console.error('❌ Admin: Image failed to load:', {
                      url: coverUrl,
                      eventTitle: event.title,
                      eventId: event.id,
                      error: e
                    });
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const placeholder = target.nextElementSibling as HTMLElement;
                    if (placeholder) {
                      placeholder.classList.remove('hidden');
                    }
                  }}
                />
                <div className="image-placeholder hidden">
                  <Calendar className="placeholder-icon" />
                </div>
              </>
            ) : (
              <div className="image-placeholder">
                <Calendar className="placeholder-icon" />
              </div>
            )}
          </div>

          {/* Event Title and Status */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{event.title}</h3>
            
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                event.status === 'approved' 
                  ? 'bg-green-100 text-green-800' 
                  : event.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : event.status === 'draft'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {event.status === 'approved' ? 'APPROVED' : 
                 event.status === 'cancelled' ? 'CANCELLED' :
                 event.status === 'draft' ? 'DRAFT' : 
                 event.status.toUpperCase()}
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                event.is_registration_open
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {event.is_registration_open ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-1 text-xs text-gray-600">
            <p>{event.location || 'No location'}</p>
            <p>{formatDateIST(event.event_date)} - {formatTimeIST(event.start_time)}</p>
            <p>Organizer: {event.organizerName}</p>
            <p>Capacity: {event.capacity ?? 0} | Seats: {event.seatsLeft}</p>
          </div>

          {/* Action Buttons - Stacked for Grid */}
          <form action={onAction} className="space-y-2">
            <input type="hidden" name="eventId" value={event.id} />
            
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/admin-dashboard/events/${event.id}/preview`}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium text-center"
              >
                Preview
              </Link>
              <Link
                href={`/admin-dashboard/events/${event.id}/edit`}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium text-center"
              >
                Edit
              </Link>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="submit"
                name="action"
                value="clone_event"
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium"
              >
                Clone
              </button>
              <button
                type="submit"
                name="action"
                value={event.is_registration_open ? 'close_reg' : 'open_reg'}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium"
              >
                {event.is_registration_open ? 'Close' : 'Open'}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="submit"
                name="action"
                value="cancel"
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                name="action"
                value="delete"
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
              >
                Delete
              </button>
            </div>
            
            {event.status === 'pending_approval' && (
              <button
                type="submit"
                name="action"
                value="approve"
                className="w-full px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
              >
                Approve Event
              </button>
            )}
          </form>
        </div>
      ) : (
        // List View Layout (Original)
        <>
          <div className="flex justify-between items-start mb-4">
            {/* Event Image */}
            <div className="flex-shrink-0 mr-4">
              <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
                {coverUrl ? (
                  <>
                    <img 
                      src={coverUrl} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                      onLoad={() => {
                        console.log('✅ Admin: Image loaded successfully:', coverUrl);
                      }}
                      onError={(e) => {
                        console.error('❌ Admin: Image failed to load:', {
                          url: coverUrl,
                          eventTitle: event.title,
                          eventId: event.id,
                          error: e
                        });
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const placeholder = target.nextElementSibling as HTMLElement;
                        if (placeholder) {
                          placeholder.classList.remove('hidden');
                        }
                      }}
                    />
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center hidden">
                      <Calendar className="w-8 h-8 text-purple-400" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-purple-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Event Title and Details */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h2>
              <p className="text-gray-600 text-sm">
                {event.location || 'No location'} - {formatDateIST(event.event_date)} - {formatTimeIST(event.start_time)} - {formatTimeIST(event.end_time)}
              </p>
              <div className="mt-2">
                <span className="text-sm text-gray-600">Organizer: </span>
                <span className="text-sm font-medium text-gray-900">{event.organizerName}</span>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-col gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                event.status === 'approved' 
                  ? 'bg-green-100 text-green-800' 
                  : event.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : event.status === 'draft'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {event.status === 'approved' ? 'APPROVED' : 
                 event.status === 'cancelled' ? 'CANCELLED' :
                 event.status === 'draft' ? 'DRAFT' : 
                 event.status.toUpperCase()}
              </span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                event.is_registration_open
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {event.is_registration_open ? 'REGISTRATIONS OPEN' : 'REGISTRATIONS CLOSED'}
              </span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Capacity / Seats Left</p>
              <p className="text-lg font-semibold text-gray-900">{event.capacity ?? 0} / {event.seatsLeft}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Registrations</p>
              <p className="text-lg font-semibold text-gray-900">{event.confirmedCount} confirmed, {event.pendingCount} pending</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full overflow-hidden">
            <Link
              href={`/admin-dashboard/events/${event.id}/preview`}
              className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex-shrink-0 min-w-0"
            >
              Preview
            </Link>
            
            <Link
              href={`/admin-dashboard/events/${event.id}/edit`}
              className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex-shrink-0 min-w-0"
            >
              Edit Event
            </Link>
            
            <button
              type="button"
              onClick={() => {
                const formData = new FormData();
                formData.append('eventId', event.id);
                formData.append('action', 'clone_event');
                onAction?.(formData);
              }}
              className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex-shrink-0 min-w-0"
            >
              Clone Event
            </button>
            
            <button
              type="button"
              onClick={() => {
                const formData = new FormData();
                formData.append('eventId', event.id);
                formData.append('action', event.is_registration_open ? 'close_reg' : 'open_reg');
                onAction?.(formData);
              }}
              className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex-shrink-0 min-w-0"
            >
              {event.is_registration_open ? 'Close Registrations' : 'Open Registrations'}
            </button>
            
            <button
              type="button"
              onClick={() => handleConfirmAction('cancel', 'Cancel Event', 'bg-red-600')}
              className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex-shrink-0 min-w-0"
            >
              Cancel Event
            </button>
            
            <button
              type="button"
              onClick={() => handleConfirmAction('delete', 'Delete Event', 'bg-red-600')}
              className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex-shrink-0 min-w-0"
            >
              Delete Event
            </button>
            
            {event.status === 'pending_approval' && (
              <button
                type="button"
                onClick={() => {
                  const formData = new FormData();
                  formData.append('eventId', event.id);
                  formData.append('action', 'approve');
                  onAction?.(formData);
                }}
                className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex-shrink-0 min-w-0"
              >
                Approve Event
              </button>
            )}
          </div>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="bg-white border-none shadow-2xl rounded-3xl max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900">{pendingAction?.label}?</DialogTitle>
                <DialogDescription className="text-gray-500 pt-2">
                  Are you sure you want to {pendingAction?.label.toLowerCase()} "{event.title}"? This action may have significant consequences.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex flex-row gap-3 pt-6 sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 sm:flex-none h-11 rounded-xl border-gray-100 font-medium"
                >
                  Go Back
                </Button>
                <Button
                  onClick={executeAction}
                  className={`flex-1 sm:flex-none h-11 rounded-xl text-white font-medium ${pendingAction?.color || 'bg-purple-600'}`}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
