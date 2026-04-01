'use client';

import { usePathname } from 'next/navigation';
import { Calendar, LayoutDashboard, PlusCircle, FileText, CheckCircle, Download, Mail, ShieldCheck, QrCode } from 'lucide-react';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

const organizerNavigationItems = [
  { href: '/organizer-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/organizer-dashboard/events', label: 'My Events', icon: Calendar },
  { href: '/organizer-dashboard/create-event', label: 'Create Event', icon: PlusCircle },
  { href: '/organizer-dashboard/registrations', label: 'Registrations', icon: FileText },
  { href: '/organizer-dashboard/attendance', label: 'Attendance', icon: CheckCircle },
  { href: '/organizer-dashboard/scanner-access', label: 'Scanner Access', icon: QrCode },
  { href: '/organizer-dashboard/payment-verification', label: 'Payment Verification', icon: ShieldCheck },
  { href: '/organizer-dashboard/emails', label: 'Event Emails', icon: Mail },
  { href: '/organizer-dashboard/exports', label: 'Exports', icon: Download },
];

const scannerNavigationItems = [
  { href: '/organizer-dashboard/attendance', label: 'Attendance', icon: CheckCircle },
];

export default function OrganizerSidebar({ mobile = false, role = 'organizer' }: { mobile?: boolean; role?: string }) {
  const pathname = usePathname();
  const navigationItems = role === 'scanner' ? scannerNavigationItems : organizerNavigationItems;
  const panelTitle = role === 'scanner' ? 'Scanner Panel' : 'Organizer Panel';
  const panelSubtitle = role === 'scanner' ? 'Attendance-only access' : 'Joules Events workspace';

  return (
    <div className={mobile ? "px-4 py-3" : "p-6"}>
      {/* Logo */}
      <div className={`flex items-center gap-2 ${mobile ? 'mb-3' : 'mb-8'}`}>
        <BrandMark compact className={mobile ? "scale-90 origin-left" : ""} subtitle={role === 'scanner' ? "Scan desk" : "Organizer desk"} />
      </div>

      {/* Panel Title */}
      {!mobile && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{panelTitle}</h2>
          <p className="text-sm text-gray-600">{panelSubtitle}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className={mobile ? "flex gap-2 overflow-x-auto pb-1" : "space-y-2"}>
        {navigationItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`${mobile ? 'shrink-0 whitespace-nowrap' : ''} flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? 'bg-purple-200 text-gray-900 shadow-sm'
                  : 'text-gray-700 hover:bg-purple-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className={mobile ? "text-sm font-medium" : ""}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
