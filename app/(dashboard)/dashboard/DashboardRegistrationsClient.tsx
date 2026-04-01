'use client';

import Link from 'next/link';
import { Calendar, MapPin, Users, Ticket, ArrowRight, ShieldCheck, Clock, QrCode, CreditCard, AlertCircle } from 'lucide-react';
import { formatDateIST } from '@/lib/date';
import { formatPrice } from '@/lib/currency';
import { parseEventImages } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Pagination from '@/components/Pagination';

interface DashboardRegistrationsClientProps {
  initialRegistrations: any[];
  totalItems: number;
  currentPage: number;
}

export default function DashboardRegistrationsClient({ initialRegistrations, totalItems, currentPage }: DashboardRegistrationsClientProps) {
  const ITEMS_PER_PAGE = 8;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  
  const paginatedRegistrations = initialRegistrations;

  if (totalItems === 0) {
    return (
      <Card className="border-dashed border-2 border-gray-200 shadow-none bg-transparent">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-6">
            <Ticket className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No registrations yet</h3>
          <p className="text-gray-600 mb-8 max-w-xs text-center">
            You haven't registered for any events. Browse our catalog to find your next experience!
          </p>
          <Link href="/events">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white px-8 h-12 rounded-xl text-base shadow-lg shadow-purple-200 transition-all active:scale-95">
              Explore Events
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {paginatedRegistrations.map((r: any) => {
          const event = r.event;
          const { coverUrl } = parseEventImages(event?.image_url);
          
          return (
            <div 
              key={r.id}
              className={`group rounded-3xl border shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden ${
                r.status === 'PENDING'
                  ? 'bg-amber-50 border-amber-200 border-l-4 border-l-amber-400'
                  : r.status === 'PENDING_VERIFICATION'
                  ? 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-400'
                  : r.status === 'REJECTED'
                  ? 'bg-red-50 border-red-200 border-l-4 border-l-red-400'
                  : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex flex-col lg:flex-row">
                {/* Event Cover Image */}
                <div className="lg:w-64 h-48 lg:h-auto relative overflow-hidden bg-gray-100 flex-shrink-0">
                  {coverUrl ? (
                    <img 
                      src={coverUrl} 
                      alt={event?.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                      <Calendar className="w-12 h-12 text-purple-300" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
                      r.status === 'CONFIRMED' 
                        ? "bg-emerald-500/20 text-emerald-700 border-emerald-500/30"
                        : r.status === 'PENDING'
                        ? "bg-amber-500/20 text-amber-700 border-amber-500/30"
                        : r.status === 'PENDING_VERIFICATION'
                        ? "bg-blue-500/20 text-blue-700 border-blue-500/30"
                        : r.status === 'REJECTED'
                        ? "bg-red-500/20 text-red-700 border-red-500/30"
                        : "bg-gray-500/20 text-gray-700 border-gray-500/30"
                    }`}>
                      {r.status === 'PENDING_VERIFICATION' ? 'VERIFYING' : r.status}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 lg:p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                          {event?.title || 'Unknown Event'}
                        </h3>
                        <div className="flex items-center text-gray-500 gap-4 flex-wrap text-sm">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {event?.event_date ? formatDateIST(event.event_date) : 'Date TBA'}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            {event?.location || 'Location TBA'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Price</div>
                        <div className="text-lg font-extrabold text-gray-900">
                          {Number(r.paid_amount) > 0 ? formatPrice(Number(r.paid_amount), r.currency || 'INR') : 'FREE'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
                      <Users className="w-3.5 h-3.5" />
                      <span suppressHydrationWarning>Registered on {new Date(r.created_at).toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {r.status === 'PENDING' ? (
                      <div className="w-full sm:w-auto flex-1">
                        <div className="flex items-center gap-3 mb-3 px-1">
                          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <p className="text-xs font-semibold text-amber-700">
                            Payment pending — your spot is reserved but not confirmed yet.
                          </p>
                        </div>
                        <Link href={`/events/${event?.id}`} className="w-full sm:w-auto block">
                          <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white px-6 h-12 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-amber-200 transition-all active:scale-95">
                            <CreditCard className="w-5 h-5" />
                            Complete Payment
                          </Button>
                        </Link>
                      </div>
                    ) : r.status === 'PENDING_VERIFICATION' ? (
                      <div className="w-full sm:w-auto flex-1">
                        <div className="flex items-start gap-3 mb-3 px-1">
                          <Clock className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-blue-700">
                              Payment proof submitted — awaiting verification by the organizer.
                            </p>
                            <p className="text-[10px] text-blue-500 mt-1">
                              Your registration will be confirmed once your payment is verified.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : r.status === 'REJECTED' ? (
                      <div className="w-full sm:w-auto flex-1">
                        <div className="flex items-start gap-3 mb-3 px-1">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-red-700">
                              Payment verification was rejected.
                            </p>
                            {r.rejection_reason && (
                              <p className="text-xs text-red-600 mt-1 bg-red-100 rounded px-2 py-1">
                                <strong>Reason:</strong> {r.rejection_reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <Link href={`/events/${event?.id}`} className="w-full sm:w-auto block">
                          <Button className="w-full bg-red-500 hover:bg-red-600 text-white px-6 h-12 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-red-200 transition-all active:scale-95">
                            Try Again
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <Link href={`/tickets/${r.id}`} className="w-full sm:w-auto">
                        <Button className="w-full bg-gray-900 hover:bg-black text-white px-6 h-12 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-xl shadow-gray-200 transition-all active:scale-95">
                          <QrCode className="w-5 h-5" />
                          View Entrance Pass
                        </Button>
                      </Link>
                    )}
                    
                    <Link href={`/events/${event?.id}`} className="ml-auto p-2 text-gray-400 hover:text-purple-600 transition-colors">
                      <ArrowRight className="w-6 h-6" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          className="mt-8"
        />
      )}
    </div>
  );
}
