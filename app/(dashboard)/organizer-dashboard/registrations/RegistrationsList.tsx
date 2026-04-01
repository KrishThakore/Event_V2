'use client';

import { formatPrice } from '@/lib/currency';
import Pagination from '@/components/Pagination';

interface RegistrationsListProps {
  registrations: any[];
  totalItems: number;
  currentPage: number;
}

export default function RegistrationsList({ registrations, totalItems, currentPage }: RegistrationsListProps) {
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="space-y-4">
      {registrations.map((reg: any) => (
        <div key={reg.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{reg.event?.title ?? 'Event'}</h3>
              <div className="mt-1">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  reg.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : reg.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : reg.status === 'PENDING_VERIFICATION' ? 'bg-blue-100 text-blue-800' : reg.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>{reg.status === 'PENDING_VERIFICATION' ? 'PENDING VERIFICATION' : reg.status}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-gray-500">{reg.entry_code ?? 'N/A'}</span>
            </div>
          </div>
          <div className="mt-3 border-t border-gray-50 pt-3">
            <p className="text-xs text-gray-600">
              {reg.user?.full_name ?? 'User'} · {reg.user?.email ?? 'No email'} · {reg.user?.phone_number ?? '—'} · {reg.user?.university ?? '—'} · Entry code: {reg.entry_code ?? 'N/A'}
            </p>
            <p className="text-[11px] text-gray-600" suppressHydrationWarning>
              Registered on {new Date(reg.created_at!).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
              {reg.paid_amount && ` · Price: ${formatPrice(Number(reg.paid_amount), reg.currency || 'INR')}`}
            </p>
          </div>
        </div>
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
