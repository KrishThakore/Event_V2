import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { serializePrisma } from '@/lib/serialize';
import PaymentsList from './PaymentsList';
import { Filter, Info, AlertTriangle, CreditCard } from 'lucide-react';

export const revalidate = 0;

interface SearchParams {
  status?: string;
  event?: string;
  page?: string;
}

export default async function AdminPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const statusFilter = searchParams?.status ?? 'all';
  const eventFilter = searchParams?.event ?? 'all';
  const page = parseInt(searchParams?.page ?? '1') || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (statusFilter !== 'all') where.status = statusFilter;
  if (eventFilter !== 'all') where.registration = { event_id: eventFilter };

  const [payments, totalCount, event, suspiciousCount] = await Promise.all([
    prisma.payments.findMany({
      where,
      include: {
        registration: {
          include: {
            event: { select: { id: true, title: true, is_paid: true, price: true, currency: true } as any },
            user: { select: { id: true, full_name: true, email: true, phone_number: true, university: true } } as any
          } as any
        } as any
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: skip
    }),
    prisma.payments.count({ where }),
    prisma.events.findMany({ where: { is_paid: true }, select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    prisma.payments.count({
      where: {
        ...where,
        status: 'SUCCESS',
        razorpay_payment_id: { not: null },
        OR: [
          { registration: null },
          { registration: { status: { not: 'CONFIRMED' } } }
        ]
      }
    })
  ]);

  const isLiveMode = process.env.RAZORPAY_KEY_ID?.startsWith('rzp_live_') || false;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">View all payments (Razorpay + QFIX/USD), filter by status and event.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filters</CardTitle>
          <CardDescription>Filter payments by status and event</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <Select name="status" defaultValue={statusFilter}>
                <SelectTrigger className="w-48 border-gray-300 rounded-lg bg-white text-black"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="CREATED">Created</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="PENDING_VERIFICATION">Pending Verification (QFIX)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Event</label>
              <Select name="event" defaultValue={eventFilter}>
                <SelectTrigger className="w-48 border-gray-300 rounded-lg bg-white text-black"><SelectValue placeholder="All event" /></SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="all">All event</SelectItem>
                  {event.map(event => <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="bg-purple-600 text-white hover:bg-purple-700 px-6 py-2">Apply Filters</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className={`border-l-4 ${isLiveMode ? 'border-l-green-500 bg-green-50' : 'border-l-amber-500 bg-amber-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isLiveMode ? 'bg-green-100' : 'bg-amber-100'}`}>
                <Info className={`w-5 h-5 ${isLiveMode ? 'text-green-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Payment system status</p>
                <p className="text-sm text-gray-600">{isLiveMode ? 'LIVE MODE – real payments are being processed.' : 'TEST MODE – payments are running in sandbox mode.'}</p>
              </div>
            </div>
            <Badge className={isLiveMode ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
              {isLiveMode ? 'Live mode' : 'Test mode'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {suspiciousCount > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Suspicious payments detected</p>
                <p className="text-sm text-gray-600">{suspiciousCount} Razorpay payment(s) marked as SUCCESS but registration is missing or not confirmed.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {payments.length === 0 ? (
        <Card><CardContent className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500">No payments match your current filters.</p>
          </div>
        </CardContent></Card>
      ) : (
        <PaymentsList payments={serializePrisma(payments)} totalItems={totalCount} currentPage={page} />
      )}
    </div>
  );
}
