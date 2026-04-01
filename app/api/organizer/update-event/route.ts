import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { parseTimeToDate } from '@/lib/date';

interface IncomingFormField {
  id?: string;
  label: string;
  field_type: 'text' | 'number' | 'select' | 'file' | 'checkbox' | 'radio' | 'textarea';
  required: boolean;
  options?: string[];
  disabled?: boolean;
  original_required?: boolean;
  condition?: {
    field_id: string;
    value: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['organizer', 'admin']);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const eventId = body?.eventId as string | undefined;
    const eventInput = body?.event;
    const formFields = (body?.form_fields ?? []) as IncomingFormField[];
    const pricingOptions = (body?.pricing_options ?? []) as any[];
    const intent = body?.intent as string | undefined;

    if (!eventId || !eventInput) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch and verify ownership/role
      const existingEvent = await tx.events.findUnique({
        where: { id: eventId }
      });

      if (!existingEvent) {
        throw new Error('Event not found');
      }

      const isOwned = existingEvent.created_by === user.id || existingEvent.assigned_organizer === user.id;
      if (!isOwned && user.role !== 'admin') {
        throw new Error('Not authorized');
      }

      const isApproved = existingEvent.status === 'approved';

      // 2. Validate restrictions for approved events
      if (isApproved) {
        const forbiddenChanges = 
          (eventInput.title && eventInput.title !== existingEvent.title) ||
          (eventInput.event_date && new Date(eventInput.event_date).getTime() !== new Date(existingEvent.event_date).getTime()) ||
          (eventInput.capacity && Number(eventInput.capacity) !== existingEvent.capacity);

        if (forbiddenChanges) {
          throw new Error('Approved events cannot change critical fields like title, date, or capacity');
        }
      }

      // 3. Update Event
      const nextStatus = !isApproved && intent === 'submit_for_approval' ? 'pending_approval' : existingEvent.status;
      
      const updatedEvent = await tx.events.update({
        where: { id: eventId },
        data: {
          description: eventInput.description ?? existingEvent.description,
          location: eventInput.location ?? existingEvent.location,
          status: nextStatus,
          // Conditionally update protected fields if not approved
          ...(!isApproved && {
            title: eventInput.title ?? existingEvent.title,
            event_date: eventInput.event_date ? new Date(eventInput.event_date) : existingEvent.event_date,
            start_time: eventInput.start_time ? parseTimeToDate(eventInput.start_time) : existingEvent.start_time,
            end_time: eventInput.end_time ? parseTimeToDate(eventInput.end_time) : existingEvent.end_time,
            capacity: Number(eventInput.capacity ?? existingEvent.capacity),
            price: Number(eventInput.price ?? existingEvent.price),
            pricing_type: eventInput.pricing_type ?? existingEvent.pricing_type,
            pricing_dropdown_label: eventInput.pricing_dropdown_label ?? existingEvent.pricing_dropdown_label,
            assigned_organizer: eventInput.assigned_organizer || null,
            visibility: eventInput.visibility || 'public',
            image_url: eventInput.image_url !== undefined ? eventInput.image_url : existingEvent.image_url,
            is_unlimited: eventInput.is_unlimited !== undefined ? !!eventInput.is_unlimited : existingEvent.is_unlimited,
            show_capacity: eventInput.show_capacity !== undefined ? !!eventInput.show_capacity : existingEvent.show_capacity,
            currency: eventInput.currency || (existingEvent as any).currency || 'INR',
            qfix_link: eventInput.qfix_link !== undefined ? (eventInput.qfix_link || null) : (existingEvent as any).qfix_link,
            use_custom_qfix_link: eventInput.use_custom_qfix_link !== undefined ? !!eventInput.use_custom_qfix_link : ((existingEvent as any).use_custom_qfix_link ?? false),
            use_dual_region_pricing: eventInput.use_dual_region_pricing !== undefined ? !!eventInput.use_dual_region_pricing : ((existingEvent as any).use_dual_region_pricing ?? false),
            dual_region_label: eventInput.dual_region_label ?? (existingEvent as any).dual_region_label ?? 'Where are you from?',
            region_labels: eventInput.region_labels || (existingEvent as any).region_labels || [],
            price_inr: eventInput.price_inr != null ? Number(eventInput.price_inr) : (existingEvent as any).price_inr ?? null,
            price_usd: eventInput.price_usd != null ? Number(eventInput.price_usd) : (existingEvent as any).price_usd ?? null
          })
        }
      });

      // 4. Update Form Fields
      if (formFields.length > 0) {
        // Disable old fields not in incoming payload
        const incomingIds = formFields.filter(f => f.id).map(f => f.id!);
        await tx.event_form_fields.updateMany({
          where: {
            event_id: eventId,
            NOT: { id: { in: incomingIds } }
          },
          data: {
            disabled: true,
            disabled_by: user.id,
            disabled_at: new Date()
          }
        });

        // Update existing fields / Create new ones
        for (const field of formFields) {
          if (field.id) {
            await tx.event_form_fields.update({
              where: { id: field.id },
              data: {
                label: field.label,
                field_type: field.field_type,
                required: field.required,
                options: field.options ?? undefined,
                condition: field.condition ?? undefined,
                disabled: false
              }
            });
          } else {
            await tx.event_form_fields.create({
              data: {
                id: field.id,
                event_id: eventId,
                label: field.label,
                field_type: field.field_type,
                required: field.required,
                options: (field.options as any) ?? undefined,
                condition: (field.condition as any) ?? undefined
              }
            });
          }
        }
      }

      // 5. Update Pricing Options (only if not approved)
      if (!isApproved && updatedEvent.pricing_type === 'custom') {
        await tx.event_pricing_options.deleteMany({ where: { event_id: eventId } });
        if (pricingOptions.length > 0) {
          await tx.event_pricing_options.createMany({
            data: pricingOptions.map(opt => ({
              event_id: eventId,
              label: opt.label.trim(),
              price: Number(opt.price),
              currency: opt.currency || eventInput.currency || 'INR',
              price_inr: opt.price_inr ? Number(opt.price_inr) : null,
              price_usd: opt.price_usd ? Number(opt.price_usd) : null
            }))
          });
        }
      }

      // 6. Log Action
      await tx.organizer_logs.create({
        data: {
          organizer_id: user.id,
          action: intent === 'submit_for_approval' ? 'SUBMIT_FOR_APPROVAL' : 'UPDATE_EVENT',
          details: { event_id: eventId, status: nextStatus }
        }
      });

      return updatedEvent;
    });

    return NextResponse.json({ success: true, event: result }, { status: 200 });
  } catch (error: any) {
    console.error('organizer update-event API error', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
