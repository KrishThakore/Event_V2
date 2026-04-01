import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Users, Calendar, CheckCircle, IndianRupee, UserCheck, TrendingUp } from 'lucide-react';
import { getISTStartOfDayUTCISOString } from '@/lib/date';

export const revalidate = 0;

async function getAdminOverviewMetrics() {
  const [usersCount, events, registrationsCount, attendanceTodayCount] = await Promise.all([
    prisma.profiles.count(),
    prisma.events.findMany({ select: { id: true, status: true, event_date: true, capacity: true, is_paid: true } }),
    prisma.registrations.count(),
    prisma.attendance.count({ where: { checked_in_at: { gte: new Date(getISTStartOfDayUTCISOString()) } } })
  ]);

  const totalEvents = events.length;
  const draftEvents = events.filter(e => e.status === 'draft').length;
  const approvedEvents = events.filter(e => e.status === 'approved').length;
  const cancelledEvents = events.filter(e => e.status === 'cancelled').length;
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.event_date as any) >= now).length;
  const totalCapacity = events.reduce((sum, e) => sum + (e.capacity ?? 0), 0);
  const capacityUtilization = totalCapacity > 0 ? Math.min(100, Math.round((registrationsCount / totalCapacity) * 100)) : 0;
  const paidEvents = events.filter(e => e.is_paid === true).length;
  const freeEvents = events.filter(e => e.is_paid !== true).length;
  const isLiveMode = process.env.RAZORPAY_KEY_ID?.startsWith('rzp_live_') || false;

  return { usersCount, totalEvents, draftEvents, approvedEvents, cancelledEvents, upcomingEvents, registrationsCount, attendanceTodayCount, capacityUtilization, paidEvents, freeEvents, isLiveMode };
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');
  
  const metrics = await getAdminOverviewMetrics();

  return (
    <div className="space-y-6">
      {/* Stats Cards Grid */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">TOTAL USERS</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.usersCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">EVENTS (DRAFT / APPROVED / CANCELLED)</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.totalEvents}</p>
              <p className="mt-1 text-sm text-gray-500">{metrics.draftEvents} draft - {metrics.approvedEvents} approved - {metrics.cancelledEvents} cancelled</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">UPCOMING EVENTS</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.upcomingEvents}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">TOTAL REGISTRATIONS</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.registrationsCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">TODAY'S ATTENDANCE</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.attendanceTodayCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">CAPACITY UTILIZATION</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.capacityUtilization}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">PAID VS FREE EVENTS</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.paidEvents}/{metrics.freeEvents}</p>
              <p className="mt-1 text-sm text-gray-500">{metrics.paidEvents} paid - {metrics.freeEvents} free</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Payment System Status Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-900">Payment system status</p>
            <p className="mt-2 text-sm text-gray-600">
              {metrics.isLiveMode
                ? 'LIVE MODE – real payments are being processed.'
                : 'TEST MODE – payments are running in sandbox mode.'}
            </p>
          </div>
          <div className={`self-start px-4 py-2 rounded-lg text-sm font-medium transition-colors sm:self-auto ${
            metrics.isLiveMode
              ? 'bg-green-600 text-white'
              : 'bg-amber-500 text-white'
          }`}>
            {metrics.isLiveMode ? 'LIVE MODE' : 'TEST MODE'}
          </div>
        </div>
      </div>
    </div>
  );
}
