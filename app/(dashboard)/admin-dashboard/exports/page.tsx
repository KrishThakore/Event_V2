import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import ExportsClient from './ExportsClient';

export const revalidate = 0;

export default async function AdminExportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const events = await prisma.events.findMany({
    where: { status: 'approved' },
    select: { id: true, title: true, event_date: true },
    orderBy: { title: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exports</h1>
          <p className="mt-1 text-sm text-gray-500">Export data as CSV files compatible with Excel. All exports are logged.</p>
        </div>
      </div>

      <ExportsClient events={events} />

      <Card className="bg-blue-50 border border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Export Information:</h4>
              <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
                <li>All exports are in CSV format, compatible with Microsoft Excel</li>
                <li>Files include proper headers and formatted data</li>
                <li>Special characters are properly escaped for Excel compatibility</li>
                <li>Exports are logged in audit logs for compliance</li>
                <li>Filenames include date suffix</li>
                <li>Attendance exports now include who scanned each checked-in attendee</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
