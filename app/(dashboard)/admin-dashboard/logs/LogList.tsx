'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Shield, Eye } from 'lucide-react';
import Pagination from '@/components/Pagination';

interface LogListProps {
  logs: any[];
  totalItems: number;
  currentPage: number;
}

export default function LogList({ logs, totalItems, currentPage }: LogListProps) {
  const itemsPerPage = 15;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="space-y-4">
      {logs.map((log: any) => (
        <Card key={log.id} className="bg-white hover:shadow-md transition-shadow border border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {log.action?.replace(/_/g, ' ').toUpperCase()}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {log.admin?.full_name || log.admin?.email || 'Unknown Admin'}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200">ADMIN ACTION</Badge>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <div suppressHydrationWarning>
                      {new Date(log.created_at!).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Log ID: {log.id.slice(0, 8)}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 lg:text-right">
                {log.details && (
                  <details className="text-right">
                    <summary className="cursor-pointer inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium">
                      <Eye className="w-4 h-4" />View Details
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-left">
                      <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
}
