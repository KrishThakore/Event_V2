import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import AttendanceClient from './AttendanceClient';
import { serializePrisma } from '@/lib/serialize';
import AttendanceEventFilter from '@/components/AttendanceEventFilter';
import { formatDateIST } from '@/lib/date';

const QRModalButton = dynamic(() => import('@/components/QRModalButton'), { ssr: false });

export const revalidate = 0;

async function handleAttendanceAction(formData: FormData) {
  'use server';
  const action = formData.get('action') as string | null;
  const registrationId = formData.get('registrationId') as string | null;
  const entryCode = formData.get('entryCode') as string | null;
  const event = formData.get('event') as string | null;
  const tab = formData.get('tab') as string | null;
  const search = formData.get('search') as string | null;
  const page = formData.get('page') as string | null;
  const params = new URLSearchParams();
  if (event && event !== 'all') params.set('event', event);
  if (tab) params.set('tab', tab);
  if (search) params.set('search', search);
  if (page) params.set('page', page);
  const redirectPath = params.toString() ? `/admin-dashboard/attendance?${params.toString()}` : '/admin-dashboard/attendance';
  if (!action) redirect(redirectPath);

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  let registration: any = null;
  let attendanceStatus: 'checked_in' | 'already_checked_in' | 'undo_success' | 'undo_noop' | 'not_found' | null = null;
  if (action === 'checkin_by_code' && entryCode) {
    registration = await prisma.registrations.findFirst({ where: { entry_code: entryCode, status: 'CONFIRMED' } });
  } else if (action === 'checkin' && registrationId) {
    registration = await prisma.registrations.findFirst({ where: { id: registrationId, status: 'CONFIRMED' } });
  } else if (action === 'undo' && registrationId) {
    registration = await prisma.registrations.findUnique({ where: { id: registrationId } });
  }

  if (!registration) {
    params.set('attendanceStatus', 'not_found');
    redirect(params.toString() ? `/admin-dashboard/attendance?${params.toString()}` : '/admin-dashboard/attendance');
  }

  if (action === 'checkin' || action === 'checkin_by_code') {
    try {
      await prisma.attendance.create({
        data: {
          registration_id: registration.id,
          scanned_by_id: session.user.id,
          scanned_by_role: 'admin',
        },
      });
      await prisma.admin_logs.create({
        data: {
          admin_id: session.user.id,
          action: 'ATTENDANCE_CHECKIN',
          details: {
            registration_id: registration.id,
            event_id: registration.event_id,
            user_id: registration.user_id,
            entry_code: registration.entry_code,
            method: action.replace('checkin_', ''),
          },
        },
      });
      attendanceStatus = 'checked_in';
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError?.code === 'P2002') {
        attendanceStatus = 'already_checked_in';
      } else {
        throw error;
      }
    }
  } else if (action === 'undo') {
    const deleted = await prisma.attendance.deleteMany({ where: { registration_id: registration.id } });
    if (deleted.count > 0) {
      await prisma.admin_logs.create({
        data: {
          admin_id: session.user.id,
          action: 'ATTENDANCE_UNDO',
          details: {
            registration_id: registration.id,
            event_id: registration.event_id,
            user_id: registration.user_id,
            entry_code: registration.entry_code,
          },
        },
      });
      attendanceStatus = 'undo_success';
    } else {
      attendanceStatus = 'undo_noop';
    }
  }

  if (attendanceStatus) params.set('attendanceStatus', attendanceStatus);
  redirect(params.toString() ? `/admin-dashboard/attendance?${params.toString()}` : '/admin-dashboard/attendance');
}

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: { event?: string; tab?: string; search?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const eventFilter = searchParams?.event ?? 'all';
  const activeTab = searchParams?.tab ?? 'absent';
  const search = searchParams?.search?.trim() ?? '';
  const page = parseInt(searchParams?.page ?? '1') || 1;
  const limit = 15;
  const skip = (page - 1) * limit;

  const events = await prisma.events.findMany({
    select: { id: true, title: true, event_date: true },
    orderBy: { title: 'asc' },
  });

  const filteredEventIds = eventFilter !== 'all' ? [eventFilter] : events.map((event) => event.id);

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

  const [totalPresent, totalAbsent, activeList, totalByEvent, presentByEvent] = await Promise.all([
    prisma.registrations.count({ where: presentWhere }),
    prisma.registrations.count({ where: absentWhere }),
    activeTab === 'present'
      ? prisma.registrations.findMany({
          where: presentWhere,
          include: {
            event: { select: { id: true, title: true, event_date: true } },
            user: { select: { id: true, full_name: true, email: true, phone_number: true, university: true } },
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
            user: { select: { id: true, full_name: true, email: true, phone_number: true, university: true } },
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

  const selectedEventId = eventFilter !== 'all' ? eventFilter : null;
  const scanModeSetting = await prisma.site_settings.findUnique({
    where: { key: 'attendance_scan_mode' },
    select: { value: true },
  });
  const adminScanMode = scanModeSetting?.value === 'slow' ? 'slow' : 'fast';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Attendance Center</h1>
        <p className="mt-2 text-gray-600">Track real-time event entry, mark attendance, and manage check-ins.</p>
      </div>

      <AttendanceEventFilter
        label="Filter by Event"
        value={eventFilter}
        allLabel="All Active Events"
        options={events.map((event) => ({
          id: event.id,
          title: event.title,
          eventDateLabel: event.event_date ? formatDateIST(event.event_date) : null,
        }))}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <div className="w-2 h-6 bg-purple-600 rounded-full" />
          Attendance Statistics
        </h2>
        {eventStats.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500 text-sm italic">
            No confirmed registrations found for current selection.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {eventStats.map((stats) => {
              const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
              return (
                <div
                  key={stats.id}
                  className="relative group rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:shadow-lg hover:shadow-gray-100"
                >
                  <h3 className="text-sm font-bold text-gray-900 mb-3 line-clamp-1">{stats.title}</h3>
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Attendance</p>
                      <div className="text-2xl font-black text-gray-900">
                        {stats.present}
                        <span className="text-xs text-gray-400 font-medium"> / {stats.total}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-none font-bold">
                      {pct}%
                    </Badge>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 transition-all duration-1000" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <div className="w-2 h-6 bg-purple-600 rounded-full" />
          Rapid Check-in
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Method A: Scanner / Search</h3>
            <form action={handleAttendanceAction} className="flex gap-2">
              <input type="hidden" name="event" value={eventFilter} />
              <input type="hidden" name="tab" value={activeTab} />
              <input type="hidden" name="search" value={search} />
              <input type="hidden" name="page" value={String(page)} />
              <input
                type="text"
                name="entryCode"
                placeholder="Entry code or scanner input..."
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500/20 focus:bg-white transition-all outline-none"
              />
              <button
                type="submit"
                name="action"
                value="checkin_by_code"
                className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-200"
              >
                Go
              </button>
            </form>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Method B: Visual QR Scan</h3>
            <QRModalButton
              eventId={selectedEventId}
              scanMode={adminScanMode}
              buttonLabel="Open QR Camera Scanner"
              className="w-full rounded-xl bg-purple-600 h-[52px] text-sm font-bold text-white hover:bg-purple-700 shadow-lg shadow-purple-100 transition-all active:scale-95"
            />
          </div>
        </div>
      </div>

      <AttendanceClient
        activeList={serializePrisma(activeList)}
        totalPresent={totalPresent}
        totalAbsent={totalAbsent}
        currentPage={page}
        activeTab={activeTab}
        onAction={handleAttendanceAction}
      />
    </div>
  );
}
