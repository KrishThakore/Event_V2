import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import ManualFixesClient from './ManualFixesClient';

export const revalidate = 0;

export default async function AdminManualFixesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const [suspiciousPayments, events] = await Promise.all([
    prisma.payments.findMany({
      where: { status: 'SUCCESS' },
      include: {
        registration: {
          include: {
            event: { select: { id: true, title: true, is_paid: true, price: true } },
            user: { select: { id: true, full_name: true, email: true } }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    }),
    prisma.events.findMany({ where: { status: 'approved' }, select: { id: true, title: true, event_date: true }, orderBy: { event_date: 'asc' } })
  ]);

  const flaggedPayments = suspiciousPayments.filter(p => !(p as any).registration || (p as any).registration.status !== 'CONFIRMED');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manual Fixes</h1>
          <p className="mt-1 text-sm text-gray-500">Fix payment-success-but-registration-missing issues, add users manually, and generate entry codes.</p>
        </div>
      </div>

      <ManualFixesClient suspiciousPayments={flaggedPayments} events={events} />

      <Card className="bg-blue-50 border border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0"><Settings className="w-4 h-4 text-blue-600" /></div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Manual Fix Guidelines:</h4>
              <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
                <li>Only use manual fixes for verified edge cases (e.g., payment success but registration failed)</li>
                <li>All manual fixes are logged in admin logs with full details</li>
                <li>Manual registrations are marked with &quot;MANUAL-&quot; prefix in entry codes</li>
                <li>Verify user identity and payment status before creating manual registrations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
