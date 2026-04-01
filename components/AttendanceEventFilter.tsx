"use client";

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type EventOption = {
  id: string;
  title: string;
  eventDateLabel?: string | null;
};

export default function AttendanceEventFilter({
  label,
  value,
  allLabel,
  options,
}: {
  label: string;
  value: string;
  allLabel: string;
  options: EventOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storageKey = `attendance-event-filter:${pathname}`;

  useEffect(() => {
    const currentEvent = searchParams.get('event');
    const savedEvent = window.localStorage.getItem(storageKey);

    if (!currentEvent && savedEvent && savedEvent !== 'all') {
      const params = new URLSearchParams(searchParams.toString());
      params.set('event', savedEvent);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [pathname, router, searchParams, storageKey]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="flex-1 max-w-md">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">{label}</label>
          <select
            value={value}
            onChange={(event) => {
              const params = new URLSearchParams(searchParams.toString());
              const nextValue = event.currentTarget.value;

              window.localStorage.setItem(storageKey, nextValue);

              if (nextValue === 'all') params.delete('event');
              else params.set('event', nextValue);

              params.delete('page');
              router.push(`${pathname}?${params.toString()}`, { scroll: false });
            }}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
          >
            <option value="all">{allLabel}</option>
            {options.map((eventOption) => (
              <option key={eventOption.id} value={eventOption.id}>
                {eventOption.title}
                {eventOption.eventDateLabel ? ` • ${eventOption.eventDateLabel}` : ''}
              </option>
            ))}
          </select>
        </div>
        <p className="md:mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Updates automatically
        </p>
      </div>
    </div>
  );
}
