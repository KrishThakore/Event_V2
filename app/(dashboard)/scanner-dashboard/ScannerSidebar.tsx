'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckCircle, Download } from 'lucide-react';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

const navigationItems = [
  { href: '/scanner-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scanner-dashboard/attendance', label: 'Attendance', icon: CheckCircle },
  { href: '/scanner-dashboard/exports', label: 'Exports', icon: Download },
];

export default function ScannerSidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <div className={mobile ? 'px-4 py-3' : 'p-6'}>
      <div className={`${mobile ? 'mb-3' : 'mb-8'} rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-cyan-50 px-4 py-4 shadow-sm`}>
        <BrandMark compact subtitle="Scan desk" />
      </div>

      {!mobile && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Scanner Panel</h2>
          <p className="text-sm text-gray-500">Assigned event attendance only</p>
        </div>
      )}

      <nav className={mobile ? 'flex gap-2 overflow-x-auto pb-1' : 'space-y-2'}>
        {navigationItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/scanner-dashboard' && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`${mobile ? 'shrink-0 whitespace-nowrap' : ''} flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-sky-100 to-blue-100 text-sky-950 shadow-sm'
                  : 'text-gray-700 hover:bg-sky-50'
              }`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? 'bg-white/80 text-sky-700' : 'bg-gray-50 text-gray-500'}`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className={mobile ? 'text-sm font-medium' : ''}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
