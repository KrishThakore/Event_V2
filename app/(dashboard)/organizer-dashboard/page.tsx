import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Calendar, Users, ListChecks, Clock, PieChart } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { getISTDateYYYYMMDD } from '@/lib/date';

export const revalidate = 0;

async function getOrganizerOverviewMetrics(organizerId: string) {
  const events = await prisma.events.findMany({
    where: { OR: [{ created_by: organizerId }, { assigned_organizer: organizerId }] },
    select: { id: true, status: true, event_date: true, capacity: true }
  });

  const eventIds = events.map(e => e.id);

  const [registrations, upcomingCount] = await Promise.all([
    eventIds.length > 0
      ? prisma.registrations.findMany({
          where: { event_id: { in: eventIds } },
          select: { event_id: true, status: true, created_at: true }
        })
      : Promise.resolve([]),
    prisma.events.count({
      where: {
        OR: [{ created_by: organizerId }, { assigned_organizer: organizerId }],
        event_date: { gte: new Date(getISTDateYYYYMMDD()) },
        status: 'approved'
      }
    })
  ]);

  const totalEvents = events.length;
  const draftEvents = events.filter(e => e.status === 'draft').length;
  const pendingEvents = events.filter(e => e.status === 'pending' || e.status === 'pending_approval').length;
  const approvedEvents = events.filter(e => e.status === 'approved').length;
  const cancelledEvents = events.filter(e => e.status === 'cancelled').length;
  const totalRegistrations = registrations.length;
  const totalCapacity = events.reduce((sum, e) => sum + (Number(e.capacity ?? 0) || 0), 0);
  const capacityUtilization = totalCapacity > 0 ? Math.min(100, Math.round((totalRegistrations / totalCapacity) * 100)) : 0;

  const sevenDaysAgo = subDays(new Date(), 7);
  const registrationActivity = registrations
    .filter(r => r.created_at && new Date(r.created_at) >= sevenDaysAgo)
    .reduce((acc: Record<string, number>, r) => {
      const date = format(new Date(r.created_at!), 'MMM d');
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

  const activityData = [];
  for (let i = 6; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'MMM d');
    activityData.push({ date, count: registrationActivity[date] || 0 });
  }

  return { totalEvents, draftEvents, pendingEvents, approvedEvents, cancelledEvents, totalRegistrations, upcomingEvents: upcomingCount, capacityUtilization, activityData };
}

function RegistrationChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const width = 600, height = 200, padding = 40;
  const chartWidth = width - 2 * padding, chartHeight = height - 2 * padding;
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - (d.count / maxCount) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="w-full h-auto" viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.5, 1].map(ratio => (
          <line key={ratio} x1={padding} y1={padding + chartHeight * ratio} x2={width - padding} y2={padding + chartHeight * ratio} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
        ))}
        <polygon points={`${padding},${padding + chartHeight} ${points} ${width - padding},${padding + chartHeight}`} fill="url(#gradient)" opacity="0.3" />
        <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" />
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * chartWidth;
          const y = padding + chartHeight - (d.count / maxCount) * chartHeight;
          return <circle key={i} cx={x} cy={y} r="4" fill="#3b82f6" />;
        })}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * chartWidth;
          return <text key={i} x={x} y={height - 10} textAnchor="middle" className="text-xs fill-gray-500">{d.date}</text>;
        })}
        {[0, 0.5, 1].map(ratio => (
          <text key={ratio} x={padding - 10} y={padding + chartHeight * (1 - ratio) + 5} textAnchor="end" className="text-xs fill-gray-500">
            {Math.round(maxCount * ratio)}
          </text>
        ))}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default async function OrganizerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const metrics = await getOrganizerOverviewMetrics(session.user.id);

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{metrics.totalEvents}</p>
              <p className="mt-1 text-xs text-gray-600">Total events created</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <ListChecks className="w-6 h-6 text-green-600" />
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{metrics.totalEvents}</p>
              <p className="mt-1 text-xs text-gray-600">Event status counts</p>
              <p className="mt-2 text-[10px] text-gray-500">{metrics.draftEvents} draft • {metrics.pendingEvents} pending • {metrics.approvedEvents} approved • {metrics.cancelledEvents} cancelled</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <Users className="w-6 h-6 text-purple-600" />
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{metrics.totalRegistrations}</p>
              <p className="mt-1 text-xs text-gray-600">Total registrations (your events)</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <Clock className="w-6 h-6 text-orange-600" />
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{metrics.upcomingEvents}</p>
              <p className="mt-1 text-xs text-gray-600">Upcoming events</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <PieChart className="w-6 h-6 text-pink-600" />
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{metrics.capacityUtilization}%</p>
              <p className="mt-1 text-xs text-gray-600">Capacity usage</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Event Registration Activity</h2>
        {metrics.activityData.some(d => d.count > 0) ? (
          <RegistrationChart data={metrics.activityData} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No registration activity in the last 7 days</p>
          </div>
        )}
      </div>
    </>
  );
}
