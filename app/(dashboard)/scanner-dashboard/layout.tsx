import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ScannerHeader from './ScannerHeader';
import ScannerSidebar from './ScannerSidebar';

export const revalidate = 0;

export default async function ScannerDashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/scanner');
  }

  if (session.user.role !== 'scanner') {
    redirect('/');
  }

  const userName = (session.user as any).name || (session.user as any).full_name || 'Scanner';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(186,230,253,0.55),_rgba(240,249,255,0.92)_28%,_#f8fafc_65%)] text-gray-900 lg:flex">
      <div className="hidden lg:block lg:w-72 lg:shrink-0 border-r border-sky-100/80 bg-white/80 shadow-sm backdrop-blur relative min-h-screen overflow-y-auto">
        <ScannerSidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <ScannerHeader userName={userName} />

        <div className="border-b border-sky-100/80 bg-white/85 backdrop-blur lg:hidden">
          <ScannerSidebar mobile />
        </div>
        
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
