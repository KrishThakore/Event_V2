'use client';

import { useState, FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const QRModalButton = dynamic(() => import('@/components/QRModalButton'), { ssr: false });

interface NotCheckedInItem {
  registrationId: string;
  event: any;
  user: any;
  entryCode?: string | null;
  registrationStatus: string;
}

interface Props {
  notCheckedIn: NotCheckedInItem[];
}

export function AttendanceCheckinClient({ notCheckedIn }: Props) {
  const router = useRouter();
  const [loadingByCode, setLoadingByCode] = useState(false);
  const [loadingRegistrationId, setLoadingRegistrationId] = useState<string | null>(null);
  const [notCheckedInState, setNotCheckedInState] = useState<NotCheckedInItem[]>(notCheckedIn);

  async function checkInRequest(body: { entry_code?: string; registration_id?: string }) {
    const toastId = toast.loading('Marking attendance...');
    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        const message = data?.error || 'Check-in failed';
        toast.error(message, { id: toastId });
        return false;
      }

      toast.success('Attendance marked present successfully', { id: toastId });
      // Refresh server-rendered data (attendance lists, stats)
      router.refresh();
      return true;
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('An unexpected error occurred', { id: toastId });
      return false;
    }
  }

  async function handleCheckinByCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const entryCode = (formData.get('entryCode') as string | null)?.trim();
    if (!entryCode) return;

    try {
      setLoadingByCode(true);
      const ok = await checkInRequest({ entry_code: entryCode });
      if (ok) {
        e.currentTarget.reset();
      }
    } finally {
      setLoadingByCode(false);
    }
  }


  async function handleSingleCheckin(registrationId: string) {
    try {
      setLoadingRegistrationId(registrationId);
      const ok = await checkInRequest({ registration_id: registrationId });
      if (ok) {
        // Optimistically remove from local list so UI updates immediately
        setNotCheckedInState((prev) => prev.filter((item) => item.registrationId !== registrationId));
      }
    } finally {
      setLoadingRegistrationId(null);
    }
  }

  return (
    <>
      {/* Manual Check-in Methods */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Manual Check-in</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {/* QR Scanner / Entry Code combined */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">QR Code Scanner</h3>
            <form onSubmit={handleCheckinByCode} className="space-y-2">
              <div>
                <input
                  type="text"
                  name="entryCode"
                  placeholder="Scan QR code or enter entry code"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <QRModalButton buttonLabel={loadingByCode ? 'Checking in…' : 'Check In (QR/Entry Code)'} className="w-full rounded-md bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed" />
            </form>
          </div>

          {/* QR Code (text box) - replaces Registration ID and is placed before Entry Code */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">QR Code</h3>
            <form onSubmit={handleCheckinByCode} className="space-y-2">
              <div>
                <input
                  type="text"
                  name="entryCode"
                  placeholder="Scan or paste QR code"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loadingByCode}
                className="w-full rounded-md bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingByCode ? 'Checking in…' : 'Check In (QR)'}
              </button>
            </form>
          </div>

          {/* Entry Code only */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Entry Code</h3>
            <form onSubmit={handleCheckinByCode} className="space-y-2">
              <div>
                <input
                  type="text"
                  name="entryCode"
                  placeholder="Enter entry code manually"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loadingByCode}
                className="w-full rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingByCode ? 'Checking in…' : 'Check In (Entry Code)'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Not Checked In list with client-side check-in */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Not Checked In</h2>
        {notCheckedInState.length === 0 ? (
          <p className="text-sm text-gray-600">All confirmed registrations are checked in.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {notCheckedInState.map((r) => (
              <div
                key={r.registrationId}
                className="rounded-xl border border-gray-200 bg-white p-3"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">{r.event?.title ?? 'Event'}</p>
                    <p className="text-xs text-gray-600">
                      {r.user?.full_name ?? 'User'} · {r.entryCode ?? 'N/A'}
                    </p>
                    <p className="text-[11px] text-gray-500">Confirmed registration</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSingleCheckin(r.registrationId)}
                    disabled={loadingRegistrationId === r.registrationId}
                    className="rounded-md bg-emerald-700 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingRegistrationId === r.registrationId ? 'Checking in…' : 'Check in'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
