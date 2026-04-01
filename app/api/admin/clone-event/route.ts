import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { getISTDateYYYYMMDD, parseTimeToDate } from '@/lib/date';

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
    if (!eventId) {
      return NextResponse.json({ success: false, error: 'Missing eventId' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch original event
      const fullEvent = await tx.events.findUnique({
        where: { id: eventId },
        include: {
          form_fields: true,
          pricing_options: true
        }
      });

      if (!fullEvent) {
        throw new Error('Event not found');
      }

      // 2. Create cloned event
      const clonedEvent = await tx.events.create({
        data: {
          title: body?.title || `${fullEvent.title} (Copy)`,
          description: fullEvent.description,
          location: fullEvent.location,
          event_date: body?.event_date ? new Date(body.event_date) : new Date(),
          start_time: parseTimeToDate(fullEvent.start_time),
          end_time: parseTimeToDate(fullEvent.end_time),
          capacity: fullEvent.capacity,
          is_registration_open: false,
          status: 'draft',
          price: fullEvent.price,
          pricing_type: fullEvent.pricing_type,
          pricing_dropdown_label: fullEvent.pricing_dropdown_label,
          image_url: fullEvent.image_url,
          created_by: user.id,
          assigned_organizer: user.id,
          visibility: fullEvent.visibility
        }
      });

      // 3. Clone form fields
      if (fullEvent.form_fields.length > 0) {
        await tx.event_form_fields.createMany({
          data: fullEvent.form_fields.map(field => ({
            event_id: clonedEvent.id,
            label: field.label,
            field_type: field.field_type,
            required: field.required,
            options: field.options ?? undefined,
            disabled: false,
            original_required: field.original_required
          }))
        });
      }

      // 4. Clone pricing options
      if (fullEvent.pricing_type === 'custom' && fullEvent.pricing_options.length > 0) {
        await tx.event_pricing_options.createMany({
          data: fullEvent.pricing_options.map(option => ({
            event_id: clonedEvent.id,
            label: option.label,
            price: option.price
          }))
        });
      }

      // 5. Log action
      await tx.admin_logs.create({
        data: {
          admin_id: user.id,
          action: 'EVENT_CLONE',
          details: {
            original_event_id: eventId,
            cloned_event_id: clonedEvent.id,
            original_title: fullEvent.title,
            cloned_title: clonedEvent.title
          }
        }
      });

      return clonedEvent;
    });

    return NextResponse.json({ 
      success: true, 
      event: result,
      message: 'Event cloned successfully'
    }, { status: 200 });

  } catch (error: any) {
    if (error.message === 'Not authorized' || error.message === 'Not authenticated') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Not authorized' ? 403 : 401 });
    }
    console.error('clone-event API error', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
