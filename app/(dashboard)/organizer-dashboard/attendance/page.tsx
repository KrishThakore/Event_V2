import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AttendanceClient from './AttendanceClient';
import { serializePrisma } from '@/lib/serialize';
import AttendanceEventFilter from '@/components/AttendanceEventFilter';
import { formatDateIST } from '@/lib/date';
import { getAttendanceAccessibleEventIds } from '@/lib/attendance-access';

export const revalidate = 0;

async function getAttendanceData(
  organizerId: string,
  role: string,
  searchParams: { event?: string; tab?: string; search?: string; page?: string },
) {
  const allOrganizerEventIds = await getAttendanceAccessibleEventIds(organizerId, role);
  if (allOrganizerEventIds.length === 0) {
    return { activeList: [], totalPresent: 0, totalAbsent: 0, eventStats: [], events: [] };
  }

  const eventFilter = searchParams.event ?? 'all';
  const activeTab = searchParams.tab ?? 'absent';
  const search = searchParams.search?.trim() ?? '';
  const page = parseInt(searchParams.page ?? '1') || 1;
  const limit = 15;
  const skip = (page - 1) * limit;

  const filteredEventIds = eventFilter !== 'all' ? [eventFilter] : allOrganizerEventIds;

  const baseWhere: any = {
    status: 'CONFIRMED',
    event_id: { in: filteredEventIds },
  };

  if (search) {
    baseWhere.OR = [
      { user: { full_name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { entry_code: { contains: search, mode: 'insensitive' } },
      { event: { title: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const presentWhere = { ...baseWhere, attendance: { isNot: null } };
  const absentWhere = { ...baseWhere, attendance: { is: null } };

  const [events, totalPresent, totalAbsent, activeList, totalByEvent, presentByEvent] = await Promise.all([
    prisma.events.findMany({
      where: { id: { in: allOrganizerEventIds } },
      select: { id: true, title: true, event_date: true },
      orderBy: { title: 'asc' },
    }),
    prisma.registrations.count({ where: presentWhere }),
    prisma.registrations.count({ where: absentWhere }),
    activeTab === 'present'
      ? prisma.registrations.findMany({
          where: presentWhere,
          include: {
            event: { select: { id: true, title: true, event_date: true } },
            user: { select: { id: true, full_name: true, email: true } },
            attendance: { select: { id: true, checked_in_at: true } },
          },
          orderBy: { attendance: { checked_in_at: 'desc' } },
          take: limit,
          skip,
        })
      : prisma.registrations.findMany({
          where: absentWhere,
          include: {
            event: { select: { id: true, title: true, event_date: true } },
            user: { select: { id: true, full_name: true, email: true } },
          },
          orderBy: { created_at: 'desc' },
          take: limit,
          skip,
        }),
    prisma.registrations.groupBy({
      by: ['event_id'],
      where: { status: 'CONFIRMED', event_id: { in: filteredEventIds } },
      _count: { _all: true },
    }),
    prisma.registrations.groupBy({
      by: ['event_id'],
      where: {
        status: 'CONFIRMED',
        event_id: { in: filteredEventIds },
        attendance: { isNot: null },
      },
      _count: { _all: true },
    }),
  ]);

  const totalByEventMap = new Map(totalByEvent.map((row) => [row.event_id, row._count._all]));
  const presentByEventMap = new Map(presentByEvent.map((row) => [row.event_id, row._count._all]));
  const eventStats = events
    .filter((event) => filteredEventIds.includes(event.id))
    .map((event) => {
      const total = totalByEventMap.get(event.id) ?? 0;
      const present = presentByEventMap.get(event.id) ?? 0;
      return { id: event.id, title: event.title, total, present, absent: total - present };
    });

  return { activeList, totalPresent, totalAbsent, eventStats, events };
}

export default async function OrganizerAttendancePage({
  searchParams,
}: {
  searchParams: { event?: string; tab?: string; search?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'organizer') redirect('/organizer');

  const role = 'organizer';
  const { activeList, totalPresent, totalAbsent, eventStats, events } = await getAttendanceData(session.user.id, role, searchParams);
  const eventFilter = searchParams?.event ?? 'all';
  const selectedEventId = eventFilter !== 'all' ? eventFilter : null;
  const selectedEventName = events.find((event) => event.id === selectedEventId)?.title ?? null;
  const pageTitle = 'Attendance Tracker';
  const pageDescription = 'Real-time presence monitoring and rapid check-in tools for your events.';
  const filterLabel = 'Your Events';
  const filterAllLabel = 'Every Event You Manage';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">{pageTitle}</h1>
        <p className="mt-2 text-gray-600">{pageDescription}</p>
      </div>

      <AttendanceEventFilter
        label={filterLabel}
        value={eventFilter}
        allLabel={filterAllLabel}
        options={events.map((event) => ({
          id: event.id,
          title: event.title,
          eventDateLabel: event.event_date ? formatDateIST(event.event_date) : null,
        }))}
      />

      <AttendanceClient
        activeList={serializePrisma(activeList)}
        totalPresent={totalPresent}
        totalAbsent={totalAbsent}
        eventStats={eventStats}
        currentPage={parseInt(searchParams?.page ?? '1') || 1}
        activeTab={searchParams?.tab ?? 'absent'}
        selectedEventId={selectedEventId}
        selectedEventName={selectedEventName}
      />
    </div>
  );
}
