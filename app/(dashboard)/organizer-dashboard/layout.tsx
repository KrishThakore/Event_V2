import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OrganizerHeader from './OrganizerHeader';
import OrganizerSidebar from './OrganizerSidebar';

export const revalidate = 0;

export default async function OrganizerDashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/organizer');
  }

  if (session.user.role !== 'organizer') {
    redirect('/');
  }

  const userRole = 'organizer';
  const userName = (session.user as any).name || (session.user as any).full_name || 'Organizer';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-yellow-50 text-gray-900 lg:flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-72 lg:shrink-0 bg-gradient-to-b from-indigo-50 via-violet-50 to-orange-50 shadow-md relative min-h-screen overflow-y-auto">
        <OrganizerSidebar role={userRole} />
      </div>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navigation */}
        <OrganizerHeader userName={userName} role={userRole} />

        {/* Mobile Navigation */}
        <div className="border-b border-white/60 bg-white/70 backdrop-blur lg:hidden">
          <OrganizerSidebar mobile role={userRole} />
        </div>
        
        {/* Page Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
