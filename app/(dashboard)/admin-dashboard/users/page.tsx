import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import UsersClient from './UsersClient';
import { serializePrisma } from '@/lib/serialize';

export const revalidate = 0;

async function getUsersData(search: string, page: number) {
  const limit = 10;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { full_name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [profiles, totalCount] = await Promise.all([
    prisma.profiles.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: skip
    }),
    prisma.profiles.count({ where })
  ]);

  // Fetch stats for these specific users
  const usersWithStats = await Promise.all(profiles.map(async (p) => {
    const [eventsCreated, registrationsCount, attendanceCount] = await Promise.all([
      prisma.events.count({ where: { created_by: p.id } }),
      prisma.registrations.count({ where: { user_id: p.id } }),
      prisma.attendance.count({ where: { registration: { user_id: p.id } } })
    ]);
    
    return {
      ...p,
      stats: { eventsCreated, registrationsCount, attendanceCount }
    };
  }));

  return { users: serializePrisma(usersWithStats), totalCount };
}

export default async function AdminUsersPage({ 
  searchParams 
}: { 
  searchParams: { search?: string, page?: string } 
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const search = searchParams.search ?? '';
  const page = parseInt(searchParams.page ?? '1') || 1;

  const { users, totalCount } = await getUsersData(search, page);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-gray-900">Users & Roles</h1>
        <p className="mt-2 text-gray-600">
          Manage system access, promote organizers, and monitor user participation.
        </p>
      </div>

      <UsersClient 
        initialUsers={users} 
        totalCount={totalCount} 
        currentPage={page} 
      />
    </div>
  );
}
