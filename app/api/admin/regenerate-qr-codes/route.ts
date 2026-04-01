import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['admin']);

    // Get all confirmed registrations
    const registrations = await prisma.registrations.findMany({
      where: { status: 'CONFIRMED' },
      select: { id: true }
    });
    
    if (registrations.length === 0) {
      return NextResponse.json({ 
        message: 'No confirmed registrations found to update',
        count: 0
      });
    }
    
    console.log(`Found ${registrations.length} confirmed registrations to update`);
    
    let successCount = 0;
    let failureCount = 0;
    const updates = [];

    // Update in batches or sequentially as per original logic
    // Sequential for better logging/tracking if list is manageable
    for (const registration of registrations) {
      try {
        const newEntryCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        await prisma.registrations.update({
          where: { id: registration.id },
          data: { entry_code: newEntryCode }
        });
        
        successCount++;
        updates.push({ id: registration.id, success: true });
      } catch (err: any) {
        console.error(`Error updating registration ${registration.id}:`, err);
        failureCount++;
        updates.push({ id: registration.id, success: false, error: err.message });
      }
    }

    // Log action
    await prisma.admin_logs.create({
      data: {
        admin_id: user.id,
        action: 'REGENERATE_QR_CODES',
        details: {
          total: registrations.length,
          success: successCount,
          failure: failureCount
        }
      }
    });
    
    return NextResponse.json({
      message: `QR code regeneration completed`,
      totalRegistrations: registrations.length,
      successCount,
      failureCount,
      details: updates.slice(0, 100) // Don't return thousands of rows in JSON
    });
    
  } catch (error: any) {
    if (error.message === 'Not authorized' || error.message === 'Not authenticated') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Not authorized' ? 403 : 401 });
    }
    console.error('API regenerate-qr-codes Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
