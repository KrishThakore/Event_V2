'use client';

import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  PlusCircle, 
  FileText, 
  CheckCircle, 
  CreditCard, 
  Users, 
  Settings, 
  FileQuestion, 
  Wrench, 
  FileText as FileLog, 
  Download,
  QrCode,
  Mail,
  Database,
  ShieldCheck,
  Cog,
  RefreshCw,
  Search
} from 'lucide-react';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

const navigationItems = [
  { href: '/admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin-dashboard/events', label: 'Events', icon: Calendar },
  { href: '/admin-dashboard/create-event', label: 'Create Event', icon: PlusCircle },
  { href: '/admin-dashboard/edit-event', label: 'Edit Event', icon: FileText },
  { href: '/admin-dashboard/registrations', label: 'Registrations', icon: FileText },
  { href: '/admin-dashboard/razorpay-reconciliation', label: 'Razorpay Sync', icon: RefreshCw },
  { href: '/admin-dashboard/razorpay-lookup', label: 'Razorpay Lookup', icon: Search },
  { href: '/admin-dashboard/attendance', label: 'Attendance', icon: CheckCircle },
  { href: '/admin-dashboard/scanner-access', label: 'Scanner Access', icon: QrCode },
  { href: '/admin-dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin-dashboard/payment-verification', label: 'Payment Verification', icon: ShieldCheck },
  { href: '/admin-dashboard/users', label: 'Users', icon: Users },
  { href: '/admin-dashboard/form-control', label: 'Form Control', icon: Settings },
  { href: '/admin-dashboard/manual-fixes', label: 'Manual Fixes', icon: Wrench },
  { href: '/admin-dashboard/regenerate-qr-codes', label: 'Regenerate QR Codes', icon: QrCode },
  { href: '/admin-dashboard/emails', label: 'Event Emails', icon: Mail },
  { href: '/admin-dashboard/sync-db', label: 'Sync Database', icon: Database },
  { href: '/admin-dashboard/logs', label: 'Logs / Audit', icon: FileLog },
  { href: '/admin-dashboard/exports', label: 'Exports', icon: Download },
  { href: '/admin-dashboard/settings', label: 'Settings', icon: Cog },
];

export default function AdminSidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <div className={mobile ? "px-4 py-3" : "p-6"}>
      {/* Logo */}
      <div className={`flex items-center gap-2 ${mobile ? 'mb-3' : 'mb-8'}`}>
        <BrandMark compact className={mobile ? "scale-90 origin-left" : ""} subtitle="Control hub" />
      </div>

      {/* Panel Title */}
      {!mobile && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
          <p className="text-sm text-gray-600">Joules Events control center</p>
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
