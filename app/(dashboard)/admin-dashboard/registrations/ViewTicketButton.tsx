"use client";

import { formatPrice } from '@/lib/currency';
import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, User, Mail, CreditCard, FileText } from 'lucide-react';

interface ViewTicketButtonProps {
  registration: {
    user?: { full_name?: string | null; email?: string | null } | null;
    event?: { title?: string | null; is_paid?: boolean | null; price?: number | null; currency?: string | null } | null;
    status?: string | null;
    entry_code?: string | null;
    created_at: string;
  };
}

export function ViewTicketButton({ registration }: ViewTicketButtonProps) {
  const [open, setOpen] = useState(false);
  
  const userName = registration.user?.full_name ?? "User";
  const email = registration.user?.email ?? "No email";
  const entryCode = registration.entry_code ?? "N/A";
  const eventTitle = registration.event?.title ?? "Event";
  const status = registration.status ?? "UNKNOWN";
  const createdAt = new Date(registration.created_at).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  const priceLabel = registration.event?.is_paid
    ? `Price: ${formatPrice(registration.event.price || 0, registration.event.currency || 'INR')}`
    : "Free event";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-purple-600 border-purple-200 hover:bg-purple-50"
        onClick={() => setOpen(true)}
      >
        <FileText className="w-4 h-4 mr-2" />
        View Ticket
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Ticket Details
            </DialogTitle>
            <DialogDescription>
              Registration information for {userName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase font-semibold">Attendee</p>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <User className="w-4 h-4 text-gray-400" />
                  {userName}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase font-semibold">Entry Code</p>
                <div className="flex items-center gap-2 text-sm font-mono text-purple-600 bg-purple-50 px-2 py-1 rounded">
                  {entryCode}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase font-semibold">Event</p>
              <div className="flex items-start gap-2 text-sm text-gray-900">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                {eventTitle}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
                <div className="text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium uppercase ${
                    status === 'CONFIRMED' || status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                    status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {status}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase font-semibold">Pricing</p>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  {priceLabel}
                </div>
              </div>
            </div>

            <div className="space-y-1 border-t pt-3 mt-2">
              <p className="text-xs text-gray-500 uppercase font-semibold">Contact Email</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                {email}
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-right">Registered on {createdAt}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
