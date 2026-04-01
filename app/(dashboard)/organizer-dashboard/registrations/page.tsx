import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RegistrationsList from './RegistrationsList';
import { serializePrisma } from '@/lib/serialize';

export const revalidate = 0;

interface SearchParams {
  search?: string;
  event?: string;
  status?: string;
  page?: string;
}

export default async function OrganizerRegistrationsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'organizer') redirect('/organizer');

  const organizerId = session.user.id;
  const search = searchParams?.search?.trim() ?? null;
  const eventId = searchParams?.event ?? null;
  const status = searchParams?.status ?? null;
  const page = parseInt(searchParams?.page ?? '1') || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const organizerevent = await prisma.events.findMany({
    where: { OR: [{ created_by: organizerId }, { assigned_organizer: organizerId }] },
    select: { id: true, title: true },
    orderBy: { title: 'asc' }
  });

  const eventIds = organizerevent.map(e => e.id);
  if (eventIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Registrations</h1>
        <p className="text-sm text-gray-600">No event found.</p>
      </div>
    );
  }

  const where: any = { event_id: { in: eventIds } };
  if (eventId && eventId !== 'all') where.event_id = eventId;
  if (status && status !== 'all') where.status = status;
  if (search) {
    where.OR = [
      { entry_code: { contains: search, mode: 'insensitive' } },
      { user: { full_name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [registrations, totalCount] = await Promise.all([
    prisma.registrations.findMany({
      where,
      include: {
        event: { select: { id: true, title: true, is_paid: true, price: true, currency: true } } as any,
        user: { select: { id: true, full_name: true, email: true, phone_number: true, university: true } } as any
      } as any,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: skip
    }),
    prisma.registrations.count({ where })
  ]);

  return (
    <div className="space-y-6">
      <form method="get" className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Registrations</h1>
            <p className="mt-1 text-sm text-gray-600">View registrations for your event (read-only).</p>
            <div className="mt-4 max-w-lg">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-purple-600 text-white">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                </span>
                <input type="text" name="search" defaultValue={search ?? ''} placeholder="Search by name, email, or entry code"
                  className="w-full pl-14 pr-4 py-3 rounded-full border border-transparent bg-white text-sm text-gray-700 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <select name="event" defaultValue={eventId ?? 'all'} className="rounded-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
              <option value="all">All event</option>
              {organizerevent.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}
            </select>
            <select name="status" defaultValue={status ?? 'all'} className="rounded-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button type="submit" className="ml-2 rounded-full bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700">Apply Filters</button>
          </div>
        </div>
      </form>

      {registrations.length === 0 ? (
        <p className="text-sm text-gray-600">No registrations found.</p>
      ) : (
        <RegistrationsList 
          registrations={serializePrisma(registrations)} 
          totalItems={totalCount}
          currentPage={page}
        />
      )}
    </div>
  );
}
