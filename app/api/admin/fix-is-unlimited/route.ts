import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // Basic security: only admins can run manual DB fixes
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    // Check if the column exists in the PostgreSQL information schema
    const columnExists: any[] = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='events' AND column_name='is_unlimited';
    `;

    if (columnExists && columnExists.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'The column `is_unlimited` already exists in the `events` table. No changes made.',
        alreadyExisted: true
      });
    }

    // Since it doesn't exist, execute RAW SQL to add it
    await prisma.$executeRaw`
      ALTER TABLE "events" ADD COLUMN "is_unlimited" BOOLEAN DEFAULT false;
    `;

    return NextResponse.json({
      success: true,
      message: 'Successfully added the `is_unlimited` column to the `events` table!',
      alreadyExisted: false
    });

  } catch (error: any) {
    console.error('Column Fix Error:', error);
    return NextResponse.json({
      error: 'Failed to add the column manually',
      details: error.message || String(error)
    }, { status: 500 });
  }
}
