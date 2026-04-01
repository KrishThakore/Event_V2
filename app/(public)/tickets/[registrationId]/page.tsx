import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TicketQr } from '@/components/TicketQr';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateIST, formatTimeIST } from '@/lib/date';
import { formatINR, formatPrice } from '@/lib/currency';
import { parseEventImages } from '@/lib/utils';
import { signPayload } from '@/lib/qr';
import { TicketActions, DownloadButton } from './TicketActions';
import { 
  Calendar, 
  MapPin, 
  ArrowLeft, 
  Info,
  Hash,
  CreditCard,
  AlertCircle
} from 'lucide-react';

export const revalidate = 0;

const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

async function getTicket(registrationId: string, userId: string) {
  const registration = await prisma.registrations.findFirst({
    where: { id: registrationId, user_id: userId },
    select: {
      id: true,
      status: true,
      entry_code: true,
      created_at: true,
      paid_amount: true,
      user: {
        select: {
          full_name: true,
          email: true
        }
      },
      pricing_option: {
        select: {
          label: true
        }
      },
      event: {
        select: {
          id: true,
          title: true,
          location: true,
          event_date: true,
          start_time: true,
          end_time: true,
          is_paid: true,
          price: true,
          image_url: true,
          currency: true
        }
      }
    }
  });

  if (!registration) return null;

  return { registration, event: registration.event };
}

export default async function TicketPage({ params }: { params: { registrationId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const data = await getTicket(params.registrationId, session.user.id);
  if (!data) redirect('/');

  const { registration, event } = data as any;
  const { coverUrl } = parseEventImages(event.image_url);
  const paidAmount = Number(registration.paid_amount ?? 0);
  const ticketPrice = event.is_paid
    ? formatPrice(paidAmount > 0 ? paidAmount : Number(event.price ?? 0), event.currency || 'INR')
    : 'Complimentary';
  const accessLabel = registration.pricing_option?.label || 'Standard Access';

  // sign a token for the ticket
  const qrData = signPayload({ registration_id: registration.id });

  const status = registration.status as string;
  const statusConfig = {
    CONFIRMED: { label: '✓ Active Pass', class: 'bg-emerald-500 text-white border-emerald-600' },
    PENDING:   { label: '⏳ Payment Pending', class: 'bg-amber-400 text-white border-amber-500' },
    PENDING_VERIFICATION: { label: '🔍 Awaiting Verification', class: 'bg-blue-500 text-white border-blue-600' },
    REJECTED:  { label: '✕ Payment Rejected', class: 'bg-red-500 text-white border-red-600' },
    CANCELLED: { label: '✕ Cancelled', class: 'bg-red-500 text-white border-red-600' }
  }[status] || { label: status, class: 'bg-gray-400 text-white border-gray-500' };

  return (
    <div className="min-h-screen bg-[#FDFDFF] py-12 px-4 text-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-10">
          <Link 
            href="/dashboard" 
            className="group flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center group-hover:bg-purple-50 group-hover:border-purple-100 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="font-medium">Back to Dashboard</span>
          </Link>
          
          <TicketActions registrationId={registration.id} eventTitle={event.title} />
        </div>

        {/* Main Ticket Pass */}
        <div className="relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
            <div className={`px-5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] shadow-md border ${statusConfig.class}`}>
              {statusConfig.label}
            </div>
          </div>

          <div id="ticket-pass-container" className="flex flex-col lg:flex-row bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
            
            {/* Left: Event Details & Visual */}

            <div className="flex-[1.5] flex flex-col min-h-[500px]">
              {/* Event Image Banner */}
              <div className="h-64 relative overflow-hidden">
                {coverUrl ? (
                  <img 
                    src={coverUrl} 
                    alt={event.title} 
                    className="w-full h-full object-cover" 
                    crossOrigin="anonymous"
                    loading="eager"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-600" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-8 right-8">
                  <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
                    {event.title}
                  </h1>
                </div>
              </div>

              {/* Passenger/Event Info */}
              <div className="p-8 lg:p-10 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-8 mb-10">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attendee</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xl">👤</span>
                      <p className="text-lg font-bold text-gray-900 truncate">{registration.user.full_name}</p>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{registration.user.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pricing</p>
                    <p className="text-lg font-bold text-gray-900">
                      {ticketPrice}
                    </p>
                    <p className="text-xs text-gray-400">{accessLabel}</p>
                  </div>
                  <div className="space-y-4 col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl">
                        📅
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date & Time</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDateIST(event.event_date)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeIST(event.start_time)} - {formatTimeIST(event.end_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-xl">
                        📍
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Venue</p>
                        <p className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">
                          {event.location || 'Announced Soon'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-dashed border-gray-100">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pass Number</p>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400 font-bold">#⃣</span>
                      <span className="text-xl font-mono font-black text-gray-900 tracking-tighter">
                        {registration.entry_code || '--- ---'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Perforation (Separator) */}
            <div className="hidden lg:flex flex-col items-center justify-between py-6 px-1 bg-gray-50/50 border-x border-dashed border-gray-200 relative">
              <div className="w-8 h-8 rounded-full bg-[#FDFDFF] -mt-10 mb-auto border-b border-gray-100" />
              <div className="w-8 h-8 rounded-full bg-[#FDFDFF] -mb-10 mt-auto border-t border-gray-100" />
            </div>

            {/* Right: QR Code or Payment Pending panel */}
            <div className="lg:w-[22rem] bg-gray-50/30 p-8 lg:p-10 flex flex-col items-center justify-center">
              <div className="w-full space-y-8">

                {status === 'CONFIRMED' ? (
                  /* ——— CONFIRMED: show full QR ——— */
                  <>
                    <div className="text-center">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">Check-in Scan</h3>
                      <p className="text-xs text-gray-500">Must be scanned at the venue</p>
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="w-[300px] h-[300px] bg-white rounded-3xl border border-gray-100 shadow-xl flex items-center justify-center">
                        <TicketQr data={qrData} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div id="pdf-exclude-buttons">
                        <DownloadButton />
                      </div>
                      <p className="text-[10px] text-center text-gray-400 uppercase font-bold tracking-widest">
                        Authorized Entry Only
                      </p>
                    </div>
                  </>
                ) : status === 'PENDING' ? (
                  /* ——— PENDING: payment not completed ——— */
                  <div className="flex flex-col items-center text-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                      <CreditCard className="w-9 h-9 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg mb-2">Payment Pending</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        Your registration is reserved but your entrance pass will only be issued after payment is confirmed.
                      </p>
                    </div>
                    <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 font-medium text-left">
                          Go back to the event page to complete your payment and unlock your QR pass.
                        </p>
                      </div>
                    </div>
                    <Link href={`/events/${event.id}`} className="w-full">
                      <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white h-12 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-amber-200 transition-all active:scale-95">
                        <CreditCard className="w-5 h-5" />
                        Complete Payment
                      </Button>
                    </Link>
                  </div>
                ) : (
                  /* ——— CANCELLED ——— */
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertCircle className="w-7 h-7 text-red-400" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Registration Cancelled</h3>
                    <p className="text-sm text-gray-500">This registration has been cancelled. No entrance pass is available.</p>
                    <Link href="/events" className="w-full">
                      <Button variant="outline" className="w-full h-11 rounded-xl">Browse Events</Button>
                    </Link>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* Pro Tip/Reminder */}
        <div className="mt-12 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-3xl shadow-sm border border-gray-100 max-w-md">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <p className="text-sm text-gray-600 leading-snug">
              <span className="font-bold text-gray-900">Arrive 15 mins early.</span><br />
              Digital pass or screenshots are valid for entry scanning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
