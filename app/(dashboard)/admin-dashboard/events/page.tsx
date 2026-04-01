import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminEventsClient from './AdminEventsClient';
import { serializePrisma } from '@/lib/serialize';

export const revalidate = 0;

async function getAdminEventsData(searchParams: { search?: string, category?: string, month?: string, page?: string }) {
  const search = searchParams.search?.trim() || '';
  const month = searchParams.month || 'all';
  const page = parseInt(searchParams.page || '1') || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
      { id: { contains: search, mode: 'insensitive' } }
    ];
  }


  if (month !== 'all') {
    const now = new Date();
    if (month === 'this-month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      where.event_date = { gte: start, lte: end };
    } else if (month === 'last-month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      where.event_date = { gte: start, lte: end };
    } else if (month === 'this-year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      where.event_date = { gte: start, lte: end };
    }
  }

  const [eventsData, totalCount, organizers] = await Promise.all([
    prisma.events.findMany({
      where,
      select: { id: true, title: true, description: true, location: true, event_date: true, start_time: true, end_time: true, capacity: true, is_registration_open: true, status: true, created_by: true, assigned_organizer: true, image_url: true, is_paid: true, price: true },
      orderBy: { event_date: 'asc' },
      take: limit,
      skip: skip
    }),
    prisma.events.count({ where }),
    prisma.profiles.findMany({ select: { id: true, full_name: true } })
  ]);

  const eventIds = eventsData.map(e => e.id);
  const registrations = await prisma.registrations.findMany({
    where: { event_id: { in: eventIds } },
    select: { event_id: true, status: true }
  });

  const usageMap = new Map<string, { pending: number; confirmed: number }>();
  for (const r of registrations) {
    const key = r.event_id!;
    const entry = usageMap.get(key) ?? { pending: 0, confirmed: 0 };
    if (r.status === 'PENDING') entry.pending += 1;
    if (r.status === 'CONFIRMED') entry.confirmed += 1;
    usageMap.set(key, entry);
  }

  const orgMap = new Map<string, string>();
  for (const o of organizers) {
    orgMap.set(o.id, o.full_name ?? 'Organizer');
  }

  const eventsWithUsage = eventsData.map((e: any) => {
    const usage = usageMap.get(e.id) ?? { pending: 0, confirmed: 0 };
    const total = usage.pending + usage.confirmed;
    const capacity = Number(e.capacity ?? 0);
    const utilization = capacity > 0 ? Math.min(100, Math.round((total / capacity) * 100)) : 0;
    const seatsLeft = Math.max(0, capacity - total);
    return { ...e, organizerName: orgMap.get(e.assigned_organizer ?? e.created_by ?? '') ?? 'Unknown', pendingCount: usage.pending, confirmedCount: usage.confirmed, utilization, seatsLeft };
  });

  return { events: serializePrisma(eventsWithUsage), totalCount };
}

export default async function AdminEventsPage({ 
  searchParams 
}: { 
  searchParams: { search?: string, month?: string, page?: string } 
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const { events, totalCount } = await getAdminEventsData(searchParams);
  const page = parseInt(searchParams.page || '1') || 1;

  return (
    <AdminEventsClient 
      initialEvents={events} 
      totalCount={totalCount} 
      currentPage={page} 
    />
  );
}
