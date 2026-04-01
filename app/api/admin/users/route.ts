import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() || '';
  const page = parseInt(searchParams.get('page') || '1') || 1;
  const limit = parseInt(searchParams.get('limit') || '10') || 10;
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
  const userIds = profiles.map(p => p.id);
  
  const [eventsCounts, regCounts, attendanceCounts] = await Promise.all([
    prisma.events.groupBy({
      by: ['created_by'],
      where: { created_by: { in: userIds } },
      _count: { _all: true }
    }),
    prisma.registrations.groupBy({
      by: ['user_id'],
      where: { user_id: { in: userIds } },
      _count: { _all: true }
    }),
    prisma.attendance.groupBy({
      by: ['registration_id'],
      include: { registration: { select: { user_id: true } } }
    } as any) // Grouping by deep relations is tricky in Prisma groupBy
  ]);

  // Alternative for deep relation counts: fetch them individually or use a smarter approach
  // For now, let's just fetch them for the specific users to keep it efficient
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

  return NextResponse.json({ 
    users: usersWithStats,
    totalCount,
    currentPage: page
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { action, targetUserId } = await req.json();
  if (!action || !targetUserId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  if (targetUserId === session.user.id) return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });

  const target = await prisma.profiles.findUnique({ where: { id: targetUserId } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const adminId = session.user.id;
  const roleMap: Record<string, string> = {
    promote_student_to_scanner: 'scanner',
    promote_student_to_organizer: 'organizer',
    promote_scanner_to_organizer: 'organizer',
    promote_organizer_to_admin: 'admin',
    demote_organizer_to_scanner: 'scanner',
    demote_organizer_to_student: 'student',
    demote_scanner_to_student: 'student',
    demote_admin_to_organizer: 'organizer',
  };

  const newRole = roleMap[action];

  if (newRole) {
    await prisma.profiles.update({ where: { id: targetUserId }, data: { role: newRole } });
    await prisma.admin_logs.create({ data: { admin_id: adminId, action: action.toUpperCase(), details: { target_user_id: targetUserId, previous_role: target.role, new_role: newRole } } });
  } else if (action === 'disable_user' || action === 'enable_user') {
    const disabled = action === 'disable_user';
    await prisma.profiles.update({ where: { id: targetUserId }, data: { disabled } });
    await prisma.admin_logs.create({ data: { admin_id: adminId, action: action.toUpperCase(), details: { target_user_id: targetUserId, disabled } } });
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
