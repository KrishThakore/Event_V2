import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import PublicNavbar from '../../(public)/PublicNavbar';
import '../../(public)/EventsDashboard.css';
import { Ticket, ShieldCheck, Clock } from 'lucide-react';
import DashboardRegistrationsClient from './DashboardRegistrationsClient';
import { serializePrisma } from '@/lib/serialize';

export const revalidate = 0;

async function getParticipantDashboard(userId: string, page: number = 1) {
  const limit = 8;
  const skip = (page - 1) * limit;

  const [registrations, totalCount] = await Promise.all([
    prisma.registrations.findMany({
      where: { user_id: userId },
      include: {
        event: { 
          select: { 
            id: true, 
            title: true, 
            event_date: true, 
            is_paid: true, 
            price: true,
            location: true,
            image_url: true,
            pricing_type: true,
            currency: true
          } 
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: skip
    }),
    prisma.registrations.count({
      where: { user_id: userId }
    })
  ]);

  return { registrations, totalCount };
}

export default async function DashboardPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const page = parseInt(searchParams?.page ?? '1') || 1;
  const { registrations, totalCount } = await getParticipantDashboard(session.user.id, page);

  // Stats should reflect ALL registrations, not just the current page
  const allRegistrationsCount = await prisma.registrations.count({
    where: { user_id: session.user.id }
  });
  const confirmedCount = await prisma.registrations.count({
    where: { user_id: session.user.id, status: 'CONFIRMED' }
  });
  const pendingCount = await prisma.registrations.count({
    where: { 
      user_id: session.user.id, 
      OR: [{ status: 'PENDING' }, { status: 'PENDING_VERIFICATION' }] 
    }
  });
  
  const stats = [
    { 
      label: 'Total Events', 
      value: allRegistrationsCount, 
      icon: Ticket, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50' 
    },
    { 
      label: 'Confirmed', 
      value: confirmedCount, 
      icon: ShieldCheck, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
    { 
      label: 'Pending', 
      value: pendingCount, 
      icon: Clock, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50' 
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <PublicNavbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
            <Link href="/" className="hover:text-purple-600 transition-colors">Home</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900">Dashboard</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">My Registrations</h1>
              <p className="mt-2 text-lg text-gray-600">Manage your upcoming events and tickets</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {stats.map((stat, idx) => (
            <Card key={idx} className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-2xl ${stat.bg}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Registrations List */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Active Registrations</h2>
          </div>

          <DashboardRegistrationsClient 
            initialRegistrations={serializePrisma(registrations)} 
            totalItems={totalCount}
            currentPage={page}
          />
        </div>
      </main>

      {/* Footer Support */}
      <div className="max-w-7xl mx-auto px-4 py-20 border-t border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h4 className="text-lg font-bold text-gray-900">Need help with your ticket?</h4>
            <p className="text-gray-500">Contact the event organizer or visit our help center.</p>
          </div>
          <div className="flex gap-4">
            <button className="inline-flex items-center justify-center rounded-xl px-6 h-11 text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors">Help Center</button>
            <button className="inline-flex items-center justify-center rounded-xl px-6 h-11 text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors">Contact Support</button>
          </div>
        </div>
      </div>
    </div>
  );
}
