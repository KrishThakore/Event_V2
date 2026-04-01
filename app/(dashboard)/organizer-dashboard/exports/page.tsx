import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function OrganizerExportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'organizer') redirect('/organizer');

  const userId = session.user.id;

  const events = await prisma.events.findMany({
    where: { OR: [{ created_by: userId }, { assigned_organizer: userId }] },
    select: { id: true, title: true, event_date: true },
    orderBy: { title: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Exports</h1>
        <p className="mt-1 text-sm text-gray-600">Export data for your events (CSV). Payment details are read-only.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          { type: 'registrations', label: 'Registrations', desc: 'Export registrations for your events, including payment fields.' },
          { type: 'attendance', label: 'Attendance', desc: 'Export attendance records with timestamps and scanner identity.' },
          { type: 'payments', label: 'Payments (Read-only)', desc: 'Export payment details for registrations in your events.' },
        ].map(({ type, label, desc }) => (
          <form key={type} action="/api/organizer/exports" method="post" className="rounded-xl border border-gray-200 bg-white p-4">
            <input type="hidden" name="exportType" value={type} />
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">{label}</h2>
              <p className="text-xs text-gray-600">{desc}</p>
              <button type="submit" className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">Export CSV</button>
            </div>
          </form>
        ))}

        <form action="/api/organizer/exports" method="post" className="col-span-full rounded-xl border border-gray-200 bg-white p-4">
          <input type="hidden" name="exportType" value="event_detailed" />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-gray-900">Event Detailed Export</h2>
              <p className="text-xs text-gray-600">Export a single event with registrations, custom responses, payment fields, and attendance scanner details.</p>
            </div>
            <div className="flex gap-3 items-center w-full md:w-auto">
              <select name="eventId" className="flex-1 md:flex-none rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700" defaultValue={events[0]?.id ?? ''}>
                <option value="" disabled>Select event</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title}{event.event_date ? ` • ${new Date(event.event_date as any).toLocaleDateString()}` : ''}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">Export Event CSV</button>
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
        <p className="font-semibold text-gray-900 mb-3">Export Information:</p>
        <ul className="space-y-2">
          {['Exports are scoped to your events only.', 'All exports are CSV, compatible with Excel.', 'Payment fields are read-only.', 'Attendance exports include who scanned each entry when that data exists.', 'Event detailed export includes registrations, custom responses, payment fields, and attendance details.'].map(text => (
            <li key={text} className="flex items-start gap-2"><span className="mt-1 inline-block h-2 w-2 rounded-full bg-purple-600" /><span>{text}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
