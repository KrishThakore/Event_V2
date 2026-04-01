import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serializePrisma } from '@/lib/serialize';

export const revalidate = 0;

export default async function OrganizerEventsPage({ 
  searchParams 
}: { 
  searchParams: { page?: string, search?: string, status?: string } 
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'organizer') redirect('/organizer');

  const userId = session.user.id;
  const page = parseInt(searchParams.page ?? '1') || 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const search = searchParams.search?.trim() || '';
  const status = searchParams.status || 'all';

  const where: any = {
    AND: [
      { OR: [{ created_by: userId }, { assigned_organizer: userId }] }
    ]
  };

  if (search) {
    where.AND.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ]
    });
  }

  if (status !== 'all') {
    where.AND.push({ status });
  }

  const [events, totalCount] = await Promise.all([
    prisma.events.findMany({
      where,
      select: { id: true, title: true, location: true, event_date: true, start_time: true, end_time: true, status: true, visibility: true, created_by: true, assigned_organizer: true, image_url: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: skip
    }),
    prisma.events.count({ where })
  ]);

  // MyEventsClient expects serializable data
  const eventsData = serializePrisma(events) as any;

  const { default: MyEventsClient } = await import('./MyEventsClient');
  return (
    <MyEventsClient 
      events={eventsData} 
      totalCount={totalCount} 
      currentPage={page} 
    />
  );
}
