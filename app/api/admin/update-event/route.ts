import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { parseTimeToDate } from '@/lib/date';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['admin']);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const eventId = body?.eventId as string | undefined;
    const eventInput = body?.event;
    const formFields = (body?.form_fields ?? []) as any[];
    const allowCapacityOverride = body?.allow_capacity_override === true;

    if (!eventId || !eventInput) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.events.findUnique({ where: { id: eventId } });
      if (!existing) throw new Error('Event not found');

      // Admin Capacity Check (with override)
      const confirmedCount = await tx.registrations.count({
        where: { event_id: eventId, status: 'CONFIRMED' }
      });
      const newCapacity = Number(eventInput.capacity ?? existing.capacity);
      if (confirmedCount > newCapacity && !allowCapacityOverride) {
        throw new Error(`Capacity (${newCapacity}) is lower than confirmed registrations (${confirmedCount})`);
      }

      // Update Event
      const updated = await tx.events.update({
        where: { id: eventId },
        data: {
          title: eventInput.title ?? existing.title,
          description: eventInput.description ?? existing.description,
          location: eventInput.location ?? existing.location,
          event_date: eventInput.event_date ? new Date(eventInput.event_date) : existing.event_date,
          start_time: eventInput.start_time ? parseTimeToDate(eventInput.start_time) : existing.start_time,
          end_time: eventInput.end_time ? parseTimeToDate(eventInput.end_time) : existing.end_time,
          capacity: newCapacity,
          is_registration_open: eventInput.registration_status === 'open',
          price: Number(eventInput.price ?? existing.price),
          status: eventInput.status ?? existing.status,
          assigned_organizer: eventInput.assigned_organizer ?? existing.assigned_organizer,
          visibility: eventInput.visibility ?? existing.visibility,
          is_unlimited: eventInput.is_unlimited !== undefined ? !!eventInput.is_unlimited : existing.is_unlimited,
          show_capacity: eventInput.show_capacity !== undefined ? !!eventInput.show_capacity : existing.show_capacity
        }
      });

      // Update Form Fields
      if (formFields.length > 0) {
        const incomingIds = formFields.filter(f => f.id).map(f => f.id!);
        await tx.event_form_fields.updateMany({
          where: { event_id: eventId, NOT: { id: { in: incomingIds } } },
          data: { disabled: true, disabled_by: user.id, disabled_at: new Date() }
        });

        for (const field of formFields) {
          if (field.id) {
            await tx.event_form_fields.update({
              where: { id: field.id },
              data: {
                label: field.label,
                field_type: field.field_type,
                required: !!field.required,
                options: field.options ?? undefined,
                disabled: !!field.disabled
              }
            });
          } else {
            await tx.event_form_fields.create({
              data: {
                event_id: eventId,
                label: field.label,
                field_type: field.field_type,
                required: !!field.required,
                options: field.options ?? undefined,
                disabled: !!field.disabled
              }
            });
          }
        }
      }

      // Log action
      await tx.admin_logs.create({
        data: {
          admin_id: user.id,
          action: 'UPDATE_EVENT',
          details: { event_id: eventId, changes: eventInput }
        }
      });

      return updated;
    });

    return NextResponse.json({ success: true, event: result }, { status: 200 });

  } catch (error: any) {
    if (error.message === 'Not authorized' || error.message === 'Not authenticated') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Not authorized' ? 403 : 401 });
    }
    console.error('admin update-event API error', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
