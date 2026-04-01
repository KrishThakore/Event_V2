import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminEmailCenterClient from './AdminEmailCenterClient';
import { serializePrisma } from '@/lib/serialize';

export const revalidate = 0;

export default async function AdminEmailCenterPage({ searchParams }: { searchParams: { event_id?: string, page?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const page = parseInt(searchParams.page ?? '1') || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const [events, emailHistory, totalEmails] = await Promise.all([
    prisma.events.findMany({
      select: { id: true, title: true, event_date: true, status: true, created_at: true },
      orderBy: { event_date: 'asc' }
    }),
    prisma.event_emails.findMany({
      where: searchParams.event_id ? { event_id: searchParams.event_id } : undefined,
      include: { event: { select: { title: true } } },
      orderBy: { sent_at: 'desc' },
      take: limit,
      skip: skip
    }),
    prisma.event_emails.count({
      where: searchParams.event_id ? { event_id: searchParams.event_id } : undefined
    })
  ]);

  return (
    <AdminEmailCenterClient
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
