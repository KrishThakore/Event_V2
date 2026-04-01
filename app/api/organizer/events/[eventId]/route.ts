import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireRole(['organizer', 'admin']);
    const eventId = params.eventId;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch event to verify ownership and check status
      const event = await tx.events.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          title: true,
          status: true,
          created_by: true,
          assigned_organizer: true
        }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // 2. Verify authorization
      const isOwner = event.created_by === user.id || event.assigned_organizer === user.id;
      if (!isOwner && user.role !== 'admin') {
        throw new Error('Forbidden');
      }

      // 3. Check if event can be deleted
      if (event.status !== 'draft' && event.status !== 'pending_approval' && user.role !== 'admin') {
        throw new Error('Only draft or pending approval events can be deleted');
      }

      // 4. Delete the event (cascades should handle related records if configured in Prisma, 
      // but let's be explicit if needed or rely on schema)
      await tx.events.delete({
        where: { id: eventId }
      });

      // 5. Log action
      await tx.organizer_logs.create({
        data: {
          organizer_id: user.id,
          action: 'DELETE_EVENT',
          details: {
            event_id: eventId,
            event_title: event.title,
            event_status: event.status
          }
        }
      });

      return { success: true };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    if (error.message === 'Not authorized' || error.message === 'Not authenticated' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 401 });
    }
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
