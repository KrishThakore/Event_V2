import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAttendanceAccessibleEventIds } from '@/lib/attendance-access';

export const revalidate = 0;

export default async function ScannerExportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'scanner') redirect('/scanner');

  const eventIds = await getAttendanceAccessibleEventIds(session.user.id, 'scanner');
  const events = eventIds.length > 0
    ? await prisma.events.findMany({
        where: { id: { in: eventIds } },
        select: { id: true, title: true, event_date: true },
        orderBy: [{ title: 'asc' }],
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Scanner Exports</h1>
        <p className="mt-1 text-sm text-gray-600">Download only the entries you personally scanned.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <form action="/api/scanner/exports" method="post" className="rounded-xl border border-gray-200 bg-white p-4">
          <input type="hidden" name="exportType" value="scanned_entries_all" />
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">All Assigned Events</h2>
            <p className="text-xs text-gray-600">Export every attendance entry scanned by you across all your assigned events.</p>
            <button type="submit" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Export All Scanned Entries
            </button>
          </div>
        </form>

        <form action="/api/scanner/exports" method="post" className="rounded-xl border border-gray-200 bg-white p-4">
          <input type="hidden" name="exportType" value="scanned_entries_by_event" />
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Single Event</h2>
            <p className="text-xs text-gray-600">Export only the attendance entries you scanned for one assigned event.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                name="eventId"
                className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700"
                defaultValue={events[0]?.id ?? ''}
              >
                <option value="" disabled>Select event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}{event.event_date ? ` • ${new Date(event.event_date as any).toLocaleDateString()}` : ''}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Export Event CSV
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
        <p className="font-semibold text-gray-900 mb-3">Export Information:</p>
        <ul className="space-y-2">
          {[
            'Exports only include entries scanned by your scanner account.',
            'All exports are CSV and open in Excel.',
            'The file includes check-in time and scanner identity columns.',
            'You can export all assigned events or one specific assigned event.',
          ].map((text) => (
            <li key={text} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-blue-600" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
