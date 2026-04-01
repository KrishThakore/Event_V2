import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EventRegistrationSection } from './EventRegistrationSection';
import { redirect } from 'next/navigation';
import { Calendar, Clock, MapPin, Users, CreditCard, Ticket } from 'lucide-react';
import PublicNavbar from '../../PublicNavbar';
import '../../EventsDashboard.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateIST, getISTDateYYYYMMDD, formatTimeIST } from '@/lib/date';
import { formatINR, formatPrice } from '@/lib/currency';
import { parseEventImages } from '@/lib/utils';
import { serializePrisma } from '@/lib/serialize';
import Image from 'next/image';

// ISR: cache event detail pages for 30 seconds to reduce DB load at scale
export const revalidate = 30;


const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

async function getEventWithCapacity(id: string) {
  const event = await (prisma.events as any).findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      event_date: true,
      start_time: true,
      end_time: true,
      capacity: true,
      is_registration_open: true,
      is_paid: true,
      price: true,
      status: true,
      image_url: true,
      pricing_type: true,
      show_capacity: true,
      is_unlimited: true,
      pricing_dropdown_label: true,
      currency: true,
      use_custom_qfix_link: true,
      qfix_link: true,
      use_dual_region_pricing: true,
      dual_region_label: true,
      region_labels: true,
      price_inr: true,
      price_usd: true,
      pricing_options: {
        select: { id: true, label: true, price: true, currency: true, price_inr: true, price_usd: true },
        orderBy: [{ price: 'asc' }, { label: 'asc' }]
      },
      form_fields: {
        where: { disabled: false },
        select: { id: true, label: true, field_type: true, required: true, options: true, disabled: true, condition: true },
        orderBy: { created_at: 'asc' }
      }
    }
  });

  if (!event || event.status !== 'approved') return null;

  const confirmedCount = await prisma.registrations.count({
    where: { event_id: id, status: 'CONFIRMED' }
  });

  const used = confirmedCount;
  const remaining = Math.max(0, (Number(event.capacity) || 0) - used);

  const pricingOptions = (event.pricing_options || []).map((o: any) => ({
    id: o.id,
    label: o.label,
    price: Number(o.price),
    currency: o.currency || event.currency || 'INR',
    price_inr: o.price_inr ? Number(o.price_inr) : null,
    price_usd: o.price_usd ? Number(o.price_usd) : null
  }));

  const registration_form_fields = serializePrisma(event.form_fields || []) as any;

  // Determine the QFIX link: custom > default
  let qfixLink = '';
  const isUSDEnabled = event.currency === 'USD' || event.use_dual_region_pricing;

  if (isUSDEnabled) {
    // 1. Check for custom link first
    if (event.use_custom_qfix_link && event.qfix_link && event.qfix_link.trim() !== '') {
      qfixLink = event.qfix_link.trim();
    } 
    
    // 2. Fallback to default if no custom link found
    if (!qfixLink) {
      const setting = await (prisma as any).site_settings.findUnique({ where: { key: 'default_qfix_link' } });
      qfixLink = setting?.value || '';
    }
  }

  // Remove Decimal-heavy objects from the base event spread to avoid serialization warnings
  const { pricing_options: _po, form_fields: _ff, ...rest } = event;

  const serializedEvent = {
    ...rest,
    price: event.price ? Number(event.price) : 0,
    start_time_str: formatTimeIST(event.start_time),
    end_time_str: formatTimeIST(event.end_time),
    currency: event.currency || 'INR',
    qfix_link: qfixLink,
    use_dual_region_pricing: event.use_dual_region_pricing ?? false,
    dual_region_label: event.dual_region_label || 'Where are you from?',
    region_labels: Array.isArray(event.region_labels) ? event.region_labels : [],
    price_inr: event.price_inr ? Number(event.price_inr) : 0,
    price_usd: event.price_usd ? Number(event.price_usd) : 0,
  };

  return { event: serializedEvent, remaining, used, registration_form_fields, pricing_options: pricingOptions };
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const result = await getEventWithCapacity(params.id);
  if (!result) redirect('/events');

  const { event, remaining, used, registration_form_fields, pricing_options } = result as any;

  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;

  const todayString = getISTDateYYYYMMDD();
  const eventDateStr = event.event_date instanceof Date
    ? event.event_date.toISOString().slice(0, 10)
    : String(event.event_date);
  const dateAllowsRegistration = eventDateStr >= todayString;
  const registrationOpen = event.is_registration_open && remaining > 0 && dateAllowsRegistration;

  const existingRegistration = isLoggedIn ? await prisma.registrations.findFirst({
    where: { 
      event_id: params.id, 
      user_id: session.user.id,
      status: { in: ['PENDING', 'CONFIRMED', 'PENDING_VERIFICATION'] }
    },
    select: { id: true, status: true }
  }) : null;

  const hasRegistered = existingRegistration?.status === 'CONFIRMED';
  const hasPendingRegistration = existingRegistration?.status === 'PENDING';
  const isPendingVerification = existingRegistration?.status === 'PENDING_VERIFICATION';
  const pendingRegistrationId = (existingRegistration?.status === 'PENDING' || existingRegistration?.status === 'PENDING_VERIFICATION') ? existingRegistration.id : undefined;

  const { coverUrl, bgUrl } = parseEventImages(event.image_url);
  const heroImage = bgUrl || coverUrl;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <PublicNavbar />
      
      {/* Premium SaaS Hero Section */}
      <div className="relative w-full h-[55vh] min-h-[450px] overflow-hidden bg-gray-950 flex flex-col justify-end">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={event.title}
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 opacity-60" />
        )}
        
        {/* Soft elegant gradient from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent pointer-events-none" />
        
        <div className="relative z-10 w-full mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:w-3/4">
            {/* Badges */}
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-sm font-medium text-white border border-white/10 shadow-sm">
                <Ticket className="w-4 h-4 text-purple-300" />
                {event.pricing_type === 'custom' 
                  ? 'Custom Pricing' 
                  : event.is_paid 
                    ? `Paid • ${formatPrice(event.price, event.currency || 'INR')}` 
                    : 'Free Event'
                }
                {!PAYMENTS_ENABLED && event.is_paid && ' (Test Mode)'}
              </div>
              {registrationOpen ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md px-3 py-1 text-sm font-medium text-emerald-300 border border-emerald-500/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Registration Open
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 backdrop-blur-md px-3 py-1 text-sm font-medium text-red-300 border border-red-500/20">
                   Registration Closed
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight drop-shadow-sm">
              {event.title}
            </h1>

            {/* Quick Hero Metadata */}
            <div className="flex flex-wrap items-center gap-y-3 gap-x-8 text-gray-300 text-base md:text-lg font-medium mt-2">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span>{formatDateIST(event.event_date)}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-gray-400" />
                <span>{event.start_time_str} – {event.end_time_str}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span>{event.location}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout - 70/30 Split */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Details (70%) */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Description Card */}
            <Card className="border border-gray-100 shadow-xl shadow-gray-200/40 rounded-[2rem] bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-gray-200/50">
              <CardContent className="p-8 sm:p-12">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-8 pb-4 border-b border-gray-100">About this event</h2>
                <div 
                  className="text-gray-600 leading-relaxed break-words prose prose-lg max-w-none 
                    prose-headings:text-gray-900 prose-headings:font-bold prose-headings:tracking-tight
                    prose-p:text-gray-600 prose-strong:text-gray-900
                    prose-a:text-purple-600 prose-a:font-medium hover:prose-a:text-purple-700 hover:prose-a:underline
                    prose-ul:list-disc prose-li:marker:text-purple-600 prose-li:text-gray-600"
                  dangerouslySetInnerHTML={{ __html: event.description || 'No description available for this event.' }}
                />
              </CardContent>
            </Card>

            {/* Additional info cards could go here, mirroring the SaaS approach */}
            
            {/* Mobile Fallback Info (Hidden on Desktop) */}
            <div className="lg:hidden space-y-4">
              <h3 className="text-2xl font-extrabold tracking-tight text-gray-900 mt-10 mb-5">Event Details</h3>
              <MobileInfoCard icon={<Calendar className="w-5 h-5 transition-transform group-hover:scale-110"/>} label="Date" value={formatDateIST(event.event_date)} />
              <MobileInfoCard icon={<Clock className="w-5 h-5 transition-transform group-hover:scale-110"/>} label="Time" value={`${event.start_time_str} - ${event.end_time_str}`} />
              <MobileInfoCard icon={<MapPin className="w-5 h-5 transition-transform group-hover:scale-110"/>} label="Location" value={event.location} />
            </div>
          </div>

          {/* Right Column: Sticky Sidebar (30%) */}
          <div className="lg:col-span-4 w-full">
            <div className="sticky top-8 space-y-8">
              
              {/* Registration/CTA Card */}
              <Card className="border border-purple-100 shadow-2xl shadow-purple-200/30 rounded-[2rem] bg-gradient-to-b from-white to-purple-50/30 overflow-hidden">
                <CardContent className="p-8 space-y-8">
                  
                  {/* Capacity Header */}
                  {event.show_capacity !== false && !event.is_unlimited && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                          <div className="p-2.5 bg-gradient-to-br from-purple-100 to-indigo-50 rounded-xl text-purple-600 shadow-sm border border-purple-100/50">
                            <Users className="w-5 h-5" />
                          </div>
                          Availability
                        </h3>
                        <div className="bg-white/60 backdrop-blur-sm text-purple-700 text-sm font-bold px-4 py-1.5 rounded-full shadow-sm ring-1 ring-purple-200/60 flex items-center gap-2">
                          {remaining > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                          {remaining > 0 ? `${remaining} Left` : 'Sold Out'}
                        </div>
                      </div>
                      
                      {/* Premium sleek progress bar */}
                      <div className="pt-1 space-y-3">
                        <div className="relative w-full bg-gray-100/80 rounded-full h-2.5 overflow-hidden ring-1 ring-inset ring-gray-200/50 shadow-inner">
                          <div
                            className="absolute top-0 left-0 bg-gradient-to-r from-purple-500 via-purple-400 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min((used / event.capacity) * 100, 100)}%` }}
                          >
                            <div className="w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:1rem_1rem] animate-[progress-bg_1s_linear_infinite]" />
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm font-medium text-gray-500 px-1">
                          <span><strong className="text-gray-900 font-bold">{used}</strong> booked</span>
                          <span>{event.capacity} total capacity</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Injection */}
                  <div className="pt-6 border-t border-gray-100">
                      <EventRegistrationSection 
                        eventId={event.id as string} 
                        registrationOpen={registrationOpen} 
                        isLoggedIn={isLoggedIn}
                        hasRegistered={hasRegistered}
                        hasPendingRegistration={hasPendingRegistration}
                        isPendingVerification={isPendingVerification}
                        pendingRegistrationId={pendingRegistrationId}
                        registrationFormFields={registration_form_fields}
                        event={event}
                        pricingOptions={pricing_options}
                      />
                  </div>

                </CardContent>
              </Card>

              {/* Quick Details Sidebar Card (Desktop Only) */}
              <Card className="border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 shadow-gray-200/40 rounded-[2rem] bg-white hidden lg:block overflow-hidden relative group/card">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/40 rounded-full blur-3xl -z-10 group-hover/card:bg-purple-200/40 transition-colors duration-500 pointer-events-none" />
                <CardContent className="p-8 space-y-6 relative z-10">
                  <h3 className="text-xl font-extrabold text-gray-900 border-b border-gray-100/80 pb-5 mb-2 tracking-tight">At a Glance</h3>
                  <SidebarDetailRow icon={<Calendar className="w-5 h-5 transition-transform group-hover:scale-110"/>} label="Date" value={formatDateIST(event.event_date)} />
                  <SidebarDetailRow icon={<Clock className="w-5 h-5 transition-transform group-hover:scale-110"/>} label="Time" value={`${event.start_time_str} - ${event.end_time_str}`} />
                  <SidebarDetailRow icon={<MapPin className="w-5 h-5 transition-transform group-hover:scale-110"/>} label="Location" value={event.location} />
                  <SidebarDetailRow 
                    icon={<CreditCard className="w-5 h-5 transition-transform group-hover:scale-110"/>} 
                    label="Pricing" 
                    value={event.pricing_type === 'custom' ? 'Variable' : (event.is_paid ? formatPrice(event.price, event.currency || 'INR') : 'Free')} 
                    isLast={true}
                  />
                </CardContent>
              </Card>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function SidebarDetailRow({ icon, label, value, isLast }: { icon: React.ReactNode, label: string, value: string, isLast?: boolean }) {
  return (
    <div className={`flex items-start gap-4 group cursor-default pb-4 ${!isLast ? 'border-b border-dashed border-gray-100' : ''}`}>
      <div className="p-2.5 rounded-[14px] bg-gray-50/80 text-gray-500 ring-1 ring-inset ring-gray-200/50 transition-all duration-300 group-hover:bg-purple-50 group-hover:text-purple-600 group-hover:ring-purple-200/60 shadow-sm group-hover:shadow-md">
        {icon}
      </div>
      <div className="pt-0.5 space-y-0.5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-base font-bold text-gray-900 leading-snug group-hover:text-purple-950 transition-colors duration-300 drop-shadow-sm break-words line-clamp-3">{value}</p>
      </div>
    </div>
  );
}

function MobileInfoCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-[1.25rem] bg-white p-5 flex items-center gap-5 group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full blur-2xl -z-10 transition-colors duration-500 group-hover:bg-purple-100/50 pointer-events-none" />
      <div className="p-3.5 rounded-[14px] bg-gray-50/80 text-gray-500 ring-1 ring-inset ring-gray-200/50 transition-all duration-300 group-hover:bg-purple-50 group-hover:text-purple-600 group-hover:ring-purple-200/60 shadow-sm group-hover:shadow-md group-hover:scale-105">
        {icon}
      </div>
      <div className="space-y-0.5 z-10 w-full overflow-hidden">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-base font-bold text-gray-900 truncate">{value}</p>
      </div>
    </Card>
  );
}
