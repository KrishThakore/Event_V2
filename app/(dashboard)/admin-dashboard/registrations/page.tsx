import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RegistrationsList from './RegistrationsList';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { serializePrisma } from '@/lib/serialize';

export const revalidate = 0;

async function registrationsAction(formData: FormData) {
  'use server';

  const action = formData.get('action') as string | null;
  const registrationId = formData.get('registrationId') as string | null;
  if (!action || !registrationId) redirect('/admin-dashboard/registrations');

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const registration = await prisma.registrations.findUnique({ where: { id: registrationId } });
  if (!registration) redirect('/admin-dashboard/registrations');

  const statusMap: Record<string, string> = { confirm: 'CONFIRMED', pending: 'PENDING', cancel: 'CANCELLED', force_confirm: 'CONFIRMED' };
  const logMap: Record<string, string> = { confirm: 'REG_CONFIRM', pending: 'REG_PENDING', cancel: 'REG_CANCEL', force_confirm: 'REG_FORCE_CONFIRM' };
  const newStatus = statusMap[action];

  if (newStatus) {
    await prisma.registrations.update({ where: { id: registrationId }, data: { status: newStatus } });
    await prisma.admin_logs.create({
      data: { admin_id: session.user.id, action: logMap[action], details: { registration_id: registration.id, event_id: registration.event_id, user_id: registration.user_id, previous_status: registration.status, new_status: newStatus } }
    });
  }

  redirect('/admin-dashboard/registrations');
}

interface SearchParams {
  search?: string;
  event?: string;
  status?: string;
  paymentType?: string;
  sourceType?: string;
  page?: string;
}

export default async function AdminRegistrationsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const search = searchParams?.search ?? null;
  const eventId = searchParams?.event ?? null;
  const status = searchParams?.status ?? null;
  const paymentType = searchParams?.paymentType ?? null;
  const sourceType = searchParams?.sourceType ?? null;
  const page = parseInt(searchParams?.page ?? '1') || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (eventId && eventId !== 'all') where.event_id = eventId;
  if (status && status !== 'all') where.status = status;
  if (sourceType === 'manual') where.entry_code = { startsWith: 'MANUAL-' };
  else if (sourceType === 'auto') where.entry_code = { not: { startsWith: 'MANUAL-' } };
  
  if (paymentType === 'paid') where.event = { is_paid: true };
  else if (paymentType === 'free') where.event = { is_paid: false };

  if (search && search.trim()) {
    where.OR = [
      { entry_code: { contains: search, mode: 'insensitive' } },
      { user: { full_name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [registrations, totalCount, event] = await Promise.all([
    prisma.registrations.findMany({
      where,
      include: {
        event: { select: { id: true, title: true, is_paid: true, price: true, currency: true } },
        user: { select: { id: true, full_name: true, email: true, phone_number: true, university: true } }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: skip
    }),
    prisma.registrations.count({ where }),
    prisma.events.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } })
  ]);

  // Apply paid/free filter in memory
  const filtered = paymentType && paymentType !== 'all'
    ? registrations.filter(r => paymentType === 'paid' ? r.event?.is_paid : !r.event?.is_paid)
    : registrations;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Registrations</h1>
          <p className="mt-1 text-sm text-slate-400">View and manage registrations. Confirm, cancel, and inspect tickets.</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <form method="GET" className="w-full flex gap-2">
            <input type="text" name="search" defaultValue={search ?? ''} placeholder="Search by name, email, or entry code"
              className="flex-1 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" />
            <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">Search</button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <form method="GET" className="grid gap-4 md:grid-cols-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event</label>
            <Select name="event" defaultValue={eventId ?? 'all'}>
              <SelectTrigger className="w-full border-gray-300 text-sm"><SelectValue placeholder="All event" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event</SelectItem>
                {event.map(ev => <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <Select name="status" defaultValue={status ?? 'all'}>
              <SelectTrigger className="w-full border-gray-300 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PENDING_VERIFICATION">Pending Verification</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
            <Select name="paymentType" defaultValue={paymentType ?? 'all'}>
              <SelectTrigger className="w-full border-gray-300 text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
            <Select name="sourceType" defaultValue={sourceType ?? 'all'}>
              <SelectTrigger className="w-full border-gray-300 text-sm"><SelectValue placeholder="All Sources" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">Apply Filters</button>
          </div>
        </form>
      </div>

      {registrations.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No registrations found.</p>
      ) : (
        <RegistrationsList 
          registrations={serializePrisma(registrations)} 
          registrationsAction={registrationsAction}
          totalItems={totalCount}
          currentPage={page}
        />
      )}
    </div>
  );
}
