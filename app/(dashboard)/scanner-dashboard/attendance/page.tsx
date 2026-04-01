import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AttendanceClient from '../../organizer-dashboard/attendance/AttendanceClient';
import { serializePrisma } from '@/lib/serialize';
import AttendanceEventFilter from '@/components/AttendanceEventFilter';
import { formatDateIST } from '@/lib/date';
import { getAttendanceAccessibleEventIds } from '@/lib/attendance-access';

export const revalidate = 0;

async function getAttendanceData(
  scannerId: string,
  searchParams: { event?: string; tab?: string; search?: string; page?: string },
) {
  const allScannerEventIds = await getAttendanceAccessibleEventIds(scannerId, 'scanner');
  if (allScannerEventIds.length === 0) {
    return { activeList: [], totalPresent: 0, totalAbsent: 0, eventStats: [], events: [] };
  }

  const eventFilter = searchParams.event ?? 'all';
  const activeTab = searchParams.tab ?? 'absent';
  const search = searchParams.search?.trim() ?? '';
  const page = parseInt(searchParams.page ?? '1') || 1;
  const limit = 15;
  const skip = (page - 1) * limit;

  const filteredEventIds = eventFilter !== 'all' ? [eventFilter] : allScannerEventIds;

  const baseWhere: any = {
    status: 'CONFIRMED',
    event_id: { in: filteredEventIds },
  };

  if (search) {
    baseWhere.OR = [
      { user: { full_name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { entry_code: { contains: search, mode: 'insensitive' } } ,
      { event: { title: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const presentWhere = { ...baseWhere, attendance: { isNot: null } };
  const absentWhere = { ...baseWhere, attendance: { is: null } };

  const [events, totalPresent, totalAbsent, activeList, totalByEvent, presentByEvent] = await Promise.all([
    prisma.events.findMany({
      where: { id: { in: allScannerEventIds } },
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

export default async function ScannerAttendancePage({
  searchParams,
}: {
  searchParams: { event?: string; tab?: string; search?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'scanner') redirect('/scanner');

  const { activeList, totalPresent, totalAbsent, eventStats, events } = await getAttendanceData(session.user.id, searchParams);
  const eventFilter = searchParams?.event ?? 'all';
  const selectedEventId = eventFilter !== 'all' ? eventFilter : null;
  const selectedEventName = events.find((event) => event.id === selectedEventId)?.title ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Attendance Scanner</h1>
        <p className="mt-2 text-gray-600">Use the same QR and attendance tools as the organizer view, limited to your assigned events.</p>
      </div>

      <AttendanceEventFilter
        label="Assigned Events"
        value={eventFilter}
        allLabel="Every Event You Can Scan"
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
