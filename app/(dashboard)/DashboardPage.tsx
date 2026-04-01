import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import PublicNavbar from '../(public)/PublicNavbar';
import '../(public)/EventsDashboard.css';
import { formatPrice } from '@/lib/currency';
import { serializePrisma } from '@/lib/serialize';

export const revalidate = 0;

const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;

  const registrations = await prisma.registrations.findMany({
    where: { user_id: userId },
    select: {
      id: true, status: true, entry_code: true, event_id: true, created_at: true,
      event: { select: { id: true, title: true, event_date: true, is_paid: true, price: true, currency: true } }
    },
    orderBy: { created_at: 'desc' }
  });

  const enriched = serializePrisma(registrations.map(r => ({ ...r, event: r.event }))) as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-orange-50">
      <PublicNavbar />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">My registrations</h1>
            <p className="text-sm text-gray-600">View and access your event tickets.</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {enriched.length === 0 && (
            <p className="text-gray-500">You have not registered for any events yet.</p>
          )}
          {enriched.map((r: any) => (
            <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between shadow-lg">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{r.event?.title ?? 'Event'}</h2>
                <p className="text-xs text-gray-600">
                  {r.event?.event_date ? new Date(r.event.event_date as string).toLocaleDateString() : 'Date TBA'}{' '}
                  {r.event?.is_paid ? `• Paid • ${formatPrice(r.event.price, r.event.currency || 'INR')}` : '• Free'}
                  {!PAYMENTS_ENABLED && r.event?.is_paid && ' · payments disabled (test mode)'}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">Registered on {new Date(r.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${r.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                  {r.status}
                </span>
                <Link href={`/tickets/${r.id}`} className="inline-flex items-center rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-400 bg-white">
                  View ticket
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
