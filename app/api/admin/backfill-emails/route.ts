import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['admin']);

    // Find profiles that are missing emails but have a corresponding user record with an email
    const missingProfiles = await prisma.profiles.findMany({
      where: {
        email: null,
      },
      select: {
        id: true
      }
    });

    if (missingProfiles.length === 0) {
      return NextResponse.json({ success: true, updated: 0, message: 'No missing emails found in profiles' });
    }

    const missingIds = missingProfiles.map(p => p.id);

    const usersWithEmails: Array<{ id: string; email: string }> = [];
    for (const id of missingIds) {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
      if (!error && data.user?.email) {
        usersWithEmails.push({ id, email: data.user.email });
      }
    }

    let updatedCount = 0;
    
    // Sync emails in a transaction or sequential updates
    await prisma.$transaction(async (tx) => {
      for (const u of usersWithEmails) {
        if (u.email) {
          await tx.profiles.update({
            where: { id: u.id },
            data: { email: u.email }
          });
          updatedCount++;
        }
      }

      // Log the admin action
      await tx.admin_logs.create({
        data: {
          admin_id: user.id,
          action: 'BACKFILL_EMAILS',
          details: { updated: updatedCount, attempted: usersWithEmails.length }
        }
      });
    });

    return NextResponse.json({ 
      success: true, 
      updated: updatedCount, 
      attempted: usersWithEmails.length 
    });

  } catch (error: any) {
    if (error.message === 'Not authorized' || error.message === 'Not authenticated') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Not authorized' ? 403 : 401 });
    }
    console.error('API backfill-emails Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
