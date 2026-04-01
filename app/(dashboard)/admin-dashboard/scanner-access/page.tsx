import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export const revalidate = 0;

async function saveScannerAssignments(formData: FormData) {
  'use server';

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    redirect('/admin');
  }

  const scannerId = (formData.get('scannerId') as string | null)?.trim();
  if (!scannerId) {
    redirect('/admin-dashboard/scanner-access');
  }

  const scanner = await prisma.profiles.findUnique({
    where: { id: scannerId },
    select: { id: true, role: true, full_name: true },
  });

  if (!scanner || scanner.role !== 'scanner') {
    redirect('/admin-dashboard/scanner-access');
  }

  const eventIds = Array.from(new Set(formData.getAll('eventIds').map((value) => String(value).trim()).filter(Boolean)));

  await prisma.$transaction(async (tx) => {
    await tx.event_scanner_assignments.deleteMany({
      where: { scanner_id: scannerId },
    });

    if (eventIds.length > 0) {
      await tx.event_scanner_assignments.createMany({
        data: eventIds.map((eventId) => ({
          event_id: eventId,
          scanner_id: scannerId,
          assigned_by: session.user.id,
        })),
        skipDuplicates: true,
      });
    }

    await tx.admin_logs.create({
      data: {
        admin_id: session.user.id,
        action: 'SCANNER_ASSIGNMENTS_UPDATED',
        details: {
          scanner_id: scannerId,
          scanner_name: scanner.full_name,
          event_ids: eventIds,
        },
      },
    });
  });

  revalidatePath('/admin-dashboard/scanner-access');
  redirect(`/admin-dashboard/scanner-access?scanner=${encodeURIComponent(scannerId)}&saved=1`);
}

export default async function ScannerAccessPage({
  searchParams,
}: {
  searchParams: { scanner?: string; saved?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const [scanners, events] = await Promise.all([
    prisma.profiles.findMany({
      where: { role: 'scanner' },
      select: { id: true, full_name: true, email: true, created_at: true },
      orderBy: [{ full_name: 'asc' }],
    }),
    prisma.events.findMany({
      select: { id: true, title: true, event_date: true, status: true, assigned_organizer: true },
      orderBy: [{ event_date: 'desc' }, { title: 'asc' }],
    }),
  ]);

  const selectedScannerId = searchParams.scanner && scanners.some((scanner) => scanner.id === searchParams.scanner)
    ? searchParams.scanner
    : scanners[0]?.id ?? null;

  const selectedScanner = scanners.find((scanner) => scanner.id === selectedScannerId) ?? null;

  const assignments = selectedScannerId
    ? await prisma.event_scanner_assignments.findMany({
        where: { scanner_id: selectedScannerId },
        select: { event_id: true },
      })
    : [];

  const assignedEventIds = new Set(assignments.map((assignment) => assignment.event_id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-gray-900">Scanner Access</h1>
        <p className="mt-2 text-gray-600">
          Create scanner-only accounts for students and limit them to QR attendance for the exact events you assign.
        </p>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <form method="get" className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-2">
            <label htmlFor="scanner" className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
              Scanner Account
            </label>
            <select
              id="scanner"
              name="scanner"
              defaultValue={selectedScannerId ?? ''}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-500/10"
            >
              {scanners.length === 0 ? (
                <option value="">No scanner accounts yet</option>
              ) : (
                scanners.map((scanner) => (
                  <option key={scanner.id} value={scanner.id}>
                    {scanner.full_name} {scanner.email ? `(${scanner.email})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-gray-900 px-5 text-sm font-bold text-white transition hover:bg-black"
            disabled={scanners.length === 0}
          >
            Load Access
          </button>
        </form>

        {searchParams.saved === '1' && selectedScanner && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Saved access for {selectedScanner.full_name}.
          </div>
        )}
      </div>

      {selectedScanner ? (
        <form action={saveScannerAssignments} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <input type="hidden" name="scannerId" value={selectedScanner.id} />

          <div className="flex flex-col gap-2 border-b border-gray-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Selected Scanner</p>
              <h2 className="mt-2 text-2xl font-black text-gray-900">{selectedScanner.full_name}</h2>
              <p className="mt-1 text-sm text-gray-600">{selectedScanner.email || 'No email on profile'}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
              This account can only use attendance scanning for the events checked below.
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
                No events found.
              </div>
            ) : (
              events.map((event) => (
                <label
                  key={event.id}
                  className="flex cursor-pointer items-start gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 transition hover:border-purple-200 hover:bg-white"
                >
                  <input
                    type="checkbox"
                    name="eventIds"
                    value={event.id}
                    defaultChecked={assignedEventIds.has(event.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{event.title}</p>
                      <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                        {event.status || 'draft'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Event date:{' '}
                      {event.event_date
                        ? new Date(event.event_date).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                          })
                        : 'Not set'}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-purple-600 px-6 text-sm font-bold text-white transition hover:bg-purple-700"
            >
              Save Scanner Access
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
          Promote a user to the <span className="font-bold text-gray-900">scanner</span> role first, then assign event access here.
        </div>
      )}
    </div>
  );
}
