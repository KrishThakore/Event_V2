'use client';

import { ViewTicketButton } from './ViewTicketButton';
import Pagination from '@/components/Pagination';

interface RegistrationsListProps {
  registrations: any[];
  registrationsAction: (formData: FormData) => Promise<void>;
  totalItems: number;
  currentPage: number;
}

export default function RegistrationsList({ 
  registrations, 
  registrationsAction, 
  totalItems, 
  currentPage 
}: RegistrationsListProps) {
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="space-y-4">
      {registrations.map((reg: any) => (
        <div key={reg.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{reg.event?.title ?? 'Event'}</h2>
              <div className="mb-3">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  reg.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : reg.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : reg.status === 'PENDING_VERIFICATION' ? 'bg-blue-100 text-blue-800' : reg.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>{reg.status === 'PENDING_VERIFICATION' ? 'PENDING VERIFICATION' : reg.status}</span>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">{reg.user?.full_name ?? 'User'}</span> - <span>{reg.user?.email ?? 'No email'}</span> - <span>{reg.user?.phone_number ?? '—'}</span> - <span>{reg.user?.university ?? '—'}</span> - <span>Entry code: {reg.entry_code ?? 'N/A'}</span>
              </div>
              <div className="text-sm text-gray-500" suppressHydrationWarning>
                Registered on {new Date(reg.created_at!).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}, {new Date(reg.created_at!).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <form action={registrationsAction} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <input type="hidden" name="registrationId" value={reg.id} />
              {reg.status !== 'PENDING' && (
                <button type="submit" name="action" value="pending" className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 sm:w-auto">Pending</button>
              )}
              {reg.status !== 'CANCELLED' && (
                <button type="submit" name="action" value="cancel" className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 sm:w-auto">Cancel</button>
              )}
              {reg.status !== 'CONFIRMED' && (
                <button type="submit" name="action" value="confirm" className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 sm:w-auto">Confirm</button>
              )}
            </form>
            <ViewTicketButton registration={reg} />
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
