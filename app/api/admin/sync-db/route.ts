import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    // Basic security: only admins can sync the DB
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    // Run prisma db push
    const { stdout, stderr } = await execAsync('npx prisma db push');

    return NextResponse.json({
      success: true,
      message: 'Database synced successfully',
      details: stdout || stderr
    });
  } catch (error: any) {
    console.error('DB Sync Error:', error);
    return NextResponse.json({
      error: 'Failed to sync database',
      details: error.message || String(error)
    }, { status: 500 });
  }
}
