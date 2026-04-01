import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Calendar, CheckCircle2, Clock3, Download, QrCode, Users } from 'lucide-react';
import { getAttendanceAccessibleEventIds } from '@/lib/attendance-access';
import Link from 'next/link';
import { formatDateIST } from '@/lib/date';

export const revalidate = 0;

export default async function ScannerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'scanner') redirect('/scanner');

  const scannerId = session.user.id;
  const eventIds = await getAttendanceAccessibleEventIds(scannerId, 'scanner');

  const [events, totalCheckedIn, totalConfirmed] = await Promise.all([
    eventIds.length > 0
      ? prisma.events.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, title: true, event_date: true, location: true, status: true },
          orderBy: [{ event_date: 'asc' }, { title: 'asc' }],
        })
      : Promise.resolve([]),
    eventIds.length > 0
      ? prisma.attendance.count({
          where: {
            scanned_by_id: scannerId,
            registration: { event_id: { in: eventIds } },
          },
        })
      : Promise.resolve(0),
    eventIds.length > 0
      ? prisma.registrations.count({
          where: { event_id: { in: eventIds }, status: 'CONFIRMED' },
        })
      : Promise.resolve(0),
  ]);

  const remaining = Math.max(totalConfirmed - totalCheckedIn, 0);

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-sky-600 shadow-sm">
          Scanner Overview
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">Scanner Dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">See your assigned events, live attendance totals, and jump into QR scanning.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-blue-100/70 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{events.length}</p>
              <p className="mt-1 text-xs font-medium text-gray-600">Assigned events</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-emerald-100/70 bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{totalCheckedIn}</p>
              <p className="mt-1 text-xs font-medium text-gray-600">Scanned by you</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-amber-100/70 bg-gradient-to-br from-amber-50 to-amber-100 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
              <Clock3 className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{remaining}</p>
              <p className="mt-1 text-xs font-medium text-gray-600">Still to scan</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-cyan-100/70 bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
              <Users className="w-6 h-6 text-cyan-600" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{totalConfirmed}</p>
              <p className="mt-1 text-xs font-medium text-gray-600">Confirmed attendees</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-100 bg-white/95 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Quick Access</h2>
              <p className="mt-1 text-sm text-gray-600">Open the attendance scanner and start checking in attendees.</p>
            </div>
            <Link
              href="/scanner-dashboard/attendance"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
            >
              <QrCode className="mr-2 h-4 w-4" />
              Open Attendance Scanner
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white/95 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Exports</h2>
              <p className="mt-1 text-sm text-gray-600">Download CSVs of the attendees you scanned.</p>
            </div>
            <Link
              href="/scanner-dashboard/exports"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-bold text-white shadow-lg shadow-slate-100 transition hover:bg-black"
            >
              <Download className="mr-2 h-4 w-4" />
              Open Exports
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white/95 p-6 shadow-sm backdrop-blur">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">Assigned Events</h2>
          <p className="mt-1 text-sm text-gray-600">These are the events you are allowed to scan attendance for.</p>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
            No events assigned yet. Ask the admin to assign scanner access.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <div key={event.id} className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-slate-50 px-5 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{event.title}</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {event.event_date ? formatDateIST(event.event_date) : 'Date not set'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{event.location || 'Location not set'}</p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
                    {event.status || 'approved'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
