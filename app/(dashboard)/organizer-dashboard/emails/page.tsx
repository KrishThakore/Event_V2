import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import OrganizerEmailCenterClient from './OrganizerEmailCenterClient';
import { serializePrisma } from '@/lib/serialize';

export const revalidate = 0;

export default async function OrganizerEmailCenterPage({ searchParams }: { searchParams: { event_id?: string, page?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'organizer') redirect('/organizer');

  const userId = session.user.id;
  const page = parseInt(searchParams.page ?? '1') || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const [events, emailHistory, totalEmails] = await Promise.all([
    prisma.events.findMany({
      where: { OR: [{ created_by: userId }, { assigned_organizer: userId }] },
      select: { id: true, title: true, event_date: true, status: true, created_at: true },
      orderBy: { event_date: 'asc' }
    }),
    prisma.event_emails.findMany({
      where: { sent_by: userId, sender_role: 'organizer', ...(searchParams.event_id ? { event_id: searchParams.event_id } : {}) },
      include: { event: { select: { title: true } } },
      orderBy: { sent_at: 'desc' },
      take: limit,
      skip: skip
    }),
    prisma.event_emails.count({
      where: { sent_by: userId, sender_role: 'organizer', ...(searchParams.event_id ? { event_id: searchParams.event_id } : {}) }
    })
  ]);

  return (
    <OrganizerEmailCenterClient
      user={{ id: session.user.id, email: session.user.email ?? '' }}
      profile={{ role: session.user.role, full_name: session.user.name ?? '' }}
      events={serializePrisma(events) as any}
      emailHistory={serializePrisma(emailHistory) as any}
      totalEmails={totalEmails}
      currentPage={page}
      selectedEventId={searchParams.event_id}
    />
  );
}
