'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { formatToIST } from '@/lib/date';

export default function ScannerHeader({ userName }: { userName: string }) {
  const [currentTime, setCurrentTime] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(formatToIST(new Date()));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.profile-dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const toastId = toast.loading('Signing out...');
    try {
      const response = await fetch('/api/organizer/logout', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Signed out successfully', { id: toastId });
        router.push('/scanner');
      } else {
        toast.error('Logout failed', { id: toastId });
      }
    } catch {
      toast.error('Logout error occurred', { id: toastId });
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-sky-100/80 bg-white/88 px-4 py-4 shadow-sm backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-500">Scanner Workspace</p>
          <p className="truncate text-sm font-semibold text-gray-900 sm:text-base">Assigned-event attendance scanning only</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-5">
          <span className="hidden text-sm font-medium text-gray-600 md:inline">{currentTime}</span>

          <button className="rounded-full p-2 text-gray-500 transition hover:bg-sky-50 hover:text-sky-700">
            <Bell className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => router.push('/scanner-dashboard')}
            className="rounded-full p-2 text-gray-500 transition hover:bg-sky-50 hover:text-sky-700"
          >
            <QrCode className="w-5 h-5" />
          </button>

          <div className="profile-dropdown relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex max-w-[180px] items-center gap-2 rounded-full border border-sky-100 bg-sky-50/70 px-3 py-2 hover:bg-sky-50 transition-colors"
            >
              <span className="truncate text-sm font-medium text-gray-800">
                Hi, {userName || 'Scanner'}
              </span>
              <span className="text-gray-500 hover:text-gray-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg z-[9999]">
                <button
                  type="button"
                  className="flex w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    router.push('/scanner-dashboard');
                    setDropdownOpen(false);
                  }}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  className="flex w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
