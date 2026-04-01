'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function OrganizerNavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/organizer-dashboard' && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-md px-3 py-2 text-xs hover:bg-purple-100 hover:text-gray-900 ${
        isActive ? 'bg-purple-200 text-gray-900' : 'text-gray-700'
      }`}
    >
      <span>{label}</span>
    </Link>
  );
}
