import { prisma } from '@/lib/prisma';
import EventsClient from './EventsClient';
import { serializePrisma } from '@/lib/serialize';
import { getISTDateYYYYMMDD } from '@/lib/date';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';
import './EventsDashboard.css';
import './ListView.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage({ 
  searchParams 
}: { 
  searchParams: { 
    page?: string, 
    search?: string, 
    tab?: string, 
    category?: string, 
    month?: string 
  } 
}) {
  const page = parseInt(searchParams.page ?? '1') || 1;
  const limit = 12;
  const skip = (page - 1) * limit;
  const search = searchParams.search?.trim() || '';
  const tab = (searchParams.tab as 'upcoming' | 'today' | 'past') || 'upcoming';
  const category = searchParams.category || 'all';
  const month = searchParams.month || 'all';

  const todayStr = getISTDateYYYYMMDD();
  const today = new Date(todayStr + 'T00:00:00Z');
  
  const where: any = {
    status: 'approved',
    AND: []
  };

  // Search filter
  if (search) {
    where.AND.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ]
    });
  }

  // Tab filter
  let dateFilter: any = {};
  if (tab === 'today') {
    dateFilter = { 
      gte: today, 
      lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) 
    };
  } else if (tab === 'past') {
    dateFilter = { lt: today };
  } else {
    // upcoming
    dateFilter = { gte: today };
  }

  // Category filter
  if (category === 'free') {
    where.is_paid = false;
  } else if (category === 'paid') {
    where.is_paid = true;
  }

  // Month filter
  if (month !== 'all') {
    const monthMap: Record<string, number> = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3,
      'May': 4, 'June': 5, 'July': 6, 'August': 7,
      'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    const monthIdx = monthMap[month];
    if (monthIdx !== undefined) {
      const year = new Date().getFullYear();
      const startDate = new Date(Date.UTC(year, monthIdx, 1));
      const endDate = new Date(Date.UTC(year, monthIdx + 1, 0, 23, 59, 59, 999));
      
      // Merge with existing date filter
      dateFilter.gte = dateFilter.gte ? (startDate > dateFilter.gte ? startDate : dateFilter.gte) : startDate;
      dateFilter.lte = dateFilter.lte ? (endDate < dateFilter.lte ? endDate : dateFilter.lte) : endDate;
      
      // Ensure gte <= lte/lt if both exist
      if (dateFilter.lt && dateFilter.gte >= dateFilter.lt) {
           // If conflicting, it might result in no events, which is correct for impossible filters
      }
    }
  }

  if (Object.keys(dateFilter).length > 0) {
    where.event_date = dateFilter;
  }

  let totalEvents = 0;
  let eventsWithCounts: any[] = [];
  let dbUnavailable = false;

  try {
    const [events, total] = await Promise.all([
      prisma.events.findMany({
        where,
        select: {
          id: true, title: true, description: true, event_date: true,
          start_time: true, end_time: true, location: true, price: true,
          is_paid: true, pricing_type: true, capacity: true, image_url: true,
          is_registration_open: true, show_capacity: true, is_unlimited: true,
          currency: true
        },
        orderBy: tab === 'past' ? { event_date: 'desc' } : { event_date: 'asc' },
        take: limit,
        skip: skip
      }),
      prisma.events.count({ where })
    ]);

    totalEvents = total;

    eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const registered_count = await prisma.registrations.count({
          where: { event_id: event.id, status: 'CONFIRMED' }
        });
        return { ...event, registered_count };
      })
    );
  } catch (error) {
    dbUnavailable = true;
    console.error('HomePage DB query failed', error);
  }

  return (
    <>
      {dbUnavailable && (
        <div className="mx-auto max-w-6xl px-6 py-4 text-sm text-red-700">
          Unable to load events right now (database connection failed). If this is a deployment, verify your Vercel
          `DATABASE_URL` and that your Supabase Postgres is reachable.
        </div>
      )}
      <EventsClient 
        initialEvents={serializePrisma(eventsWithCounts) as any} 
        totalEvents={totalEvents}
        currentPage={page}
        heroBadge="Feel The Current"
        heroSubtitle={`Bold launches, culture nights, and standout experiences by ${BRAND_NAME}. ${BRAND_TAGLINE}.`}
        heroImageUrl="/hero-joules-events.png"
      />
    </>
  );
}
