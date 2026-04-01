import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Calendar, Filter, Shield, Eye } from 'lucide-react';
import LogList from './LogList';

interface SearchParams {
  admin?: string;
  action?: string;
  date?: string;
  page?: string;
}

async function getAdminLogs(adminFilter: string | null, actionFilter: string | null, dateFilter: string | null, page: number) {
  const where: any = {};
  const limit = 15;
  const skip = (page - 1) * limit;

  if (adminFilter && adminFilter !== 'all') where.admin_id = adminFilter;
  if (actionFilter && actionFilter !== 'all') where.action = actionFilter;
  if (dateFilter && dateFilter !== 'all') {
    const today = new Date();
    let startDate: Date;
    if (dateFilter === 'today') startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    else if (dateFilter === 'week') startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (dateFilter === 'month') startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    else startDate = new Date(0);
    where.created_at = { gte: startDate };
  }

  const [logs, totalCount] = await Promise.all([
    prisma.admin_logs.findMany({
      where,
      include: { admin: { select: { id: true, full_name: true, email: true } } },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: skip
    }),
    prisma.admin_logs.count({ where })
  ]);

  return { logs, totalCount };
}

export default async function AdminLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const adminFilter = searchParams?.admin ?? 'all';
  const actionFilter = searchParams?.action ?? 'all';
  const dateFilter = searchParams?.date ?? 'all';
  const page = parseInt(searchParams?.page ?? '1') || 1;

  const [{ logs, totalCount }, admins, allActions] = await Promise.all([
    getAdminLogs(adminFilter, actionFilter, dateFilter, page),
    prisma.profiles.findMany({ where: { role: 'admin' }, select: { id: true, full_name: true, email: true }, orderBy: { full_name: 'asc' } }),
    prisma.admin_logs.findMany({ select: { action: true }, distinct: ['action'] })
  ]);

  const actions = [...new Set(allActions.map(l => l.action!).filter(Boolean))].sort();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-500">View all admin actions with full audit trail. Read-only immutable logs.</p>
        </div>
      </div>

      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />Filters
          </CardTitle>
          <CardDescription>Filter logs by admin, action, or date range</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin</label>
              <Select name="admin" defaultValue={adminFilter}>
                <SelectTrigger className="w-48 border-gray-300 rounded-lg bg-white text-black">
                  <SelectValue placeholder="All Admins" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="all">All Admins</SelectItem>
                  {admins.map((admin: any) => (
                    <SelectItem key={admin.id} value={admin.id}>{admin.full_name || admin.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <Select name="action" defaultValue={actionFilter}>
                <SelectTrigger className="w-48 border-gray-300 rounded-lg bg-white text-black">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map(action => (
                    <SelectItem key={action} value={action}>{action.replace(/_/g, ' ').toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <Select name="date" defaultValue={dateFilter}>
                <SelectTrigger className="w-48 border-gray-300 rounded-lg bg-white text-black">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="bg-purple-600 text-white hover:bg-purple-700">
                <Filter className="w-4 h-4 mr-2" />Apply Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {logs.length === 0 ? (
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
              <p className="text-gray-500">No logs match the selected filters.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
            <Badge variant="outline">{totalCount} total entries</Badge>
          </div>
          <LogList logs={logs} totalItems={totalCount} currentPage={page} />
        </div>
      )}

      <Card className="bg-blue-50 border border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">About Audit Logs:</h4>
              <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
                <li>All admin actions are automatically logged and immutable</li>
                <li>Logs include full details of actions, timestamps, and performing admin</li>
                <li>Use filters to investigate specific actions or time periods</li>
                <li>Logs cannot be deleted or modified by any admin</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
