import { prisma } from '@/lib/prisma';
import EventsClient from '../EventsClient';
import { serializePrisma } from '@/lib/serialize';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';
import '../EventsDashboard.css';

export const revalidate = 60;

interface SearchParams {
  page?: string;
  search?: string;
  tab?: string;
  category?: string;
  month?: string;
}

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const page = parseInt(searchParams?.page ?? '1') || 1;
  const search = searchParams?.search ?? '';
  const tab = searchParams?.tab ?? 'upcoming';
  const category = searchParams?.category ?? 'all';
  const month = searchParams?.month ?? 'all';
  const limit = 12;
  const skip = (page - 1) * limit;

  const where: any = { status: 'approved' };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
    ];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (tab === 'upcoming') {
    where.event_date = { gte: tomorrow };
  } else if (tab === 'today') {
    where.event_date = { gte: today, lt: tomorrow };
  } else if (tab === 'past') {
    where.event_date = { lt: today };
  }

  if (category === 'free') {
    where.OR = [
      { AND: [{ is_paid: false }, { pricing_type: { not: 'custom' } }] },
      { AND: [{ price: 0 }, { pricing_type: { not: 'custom' } }] },
    ];
  } else if (category === 'paid') {
    where.OR = [{ is_paid: true }, { pricing_type: 'custom' }, { price: { gt: 0 } }];
  }

  if (month !== 'all') {
    const monthIndex = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ].indexOf(month);

    if (monthIndex !== -1) {
      const year = new Date().getFullYear();
      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex + 1, 1);
      where.event_date = { ...where.event_date, gte: start, lt: end };
    }
  }

  const [events, totalCount] = await Promise.all([
    prisma.events.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        event_date: true,
        start_time: true,
        end_time: true,
        location: true,
        price: true,
        is_paid: true,
        pricing_type: true,
        capacity: true,
        image_url: true,
        is_registration_open: true,
        show_capacity: true,
        is_unlimited: true,
        currency: true,
      },
      orderBy: { event_date: tab === 'past' ? 'desc' : 'asc' },
      take: limit,
      skip,
    }),
    prisma.events.count({ where }),
  ]);

  const registrationCounts = await prisma.registrations.groupBy({
    by: ['event_id'],
    where: {
      event_id: { in: events.map((event) => event.id) },
      status: 'CONFIRMED',
    },
    _count: { _all: true },
  });

  const countMap = new Map(registrationCounts.map((row) => [row.event_id, row._count._all]));

  const eventsWithCounts = events.map((event) => ({
    ...event,
    registered_count: countMap.get(event.id) ?? 0,
  }));

  return (
    <EventsClient
      initialEvents={serializePrisma(eventsWithCounts) as any}
      totalEvents={totalCount}
      currentPage={page}
      heroBadge="Explore Our Selection"
      heroTitle={
        <>
          <span className="text-reveal-mask mr-6">
            <span className="text-reveal-line">Discover</span>
          </span>
          <span className="text-reveal-mask">
            <span className="text-reveal-line">Every</span>
          </span>
          <br />
          <span className="text-reveal-mask">
            <span
              className="text-reveal-line bg-gradient-to-r from-purple-600 via-fuchsia-600 to-emerald-600 bg-clip-text text-transparent"
              style={{ transitionDelay: '200ms' }}
            >
              Upcoming Event
            </span>
          </span>
        </>
      }
      heroSubtitle={`Find your next standout experience with ${BRAND_NAME}. ${BRAND_TAGLINE}.`}
      heroImageUrl="/hero-joules-events.svg"
    />
  );
}
