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

    const eventInput = body?.event;
    const formFields = (body?.form_fields ?? []) as any[];
    const pricingOptions = (body?.pricing_options ?? []) as any[];

    if (!eventInput) {
      return NextResponse.json({ success: false, error: 'Missing event payload' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Event
      const event = await tx.events.create({
        data: {
          title: eventInput.title,
          description: eventInput.description,
          location: eventInput.location,
          event_date: new Date(eventInput.event_date),
          start_time: parseTimeToDate(eventInput.start_time),
          end_time: parseTimeToDate(eventInput.end_time),
          image_url: eventInput.image_url,
          capacity: Number(eventInput.capacity),
          is_registration_open: !!eventInput.is_registration_open,
          price: Number(eventInput.price ?? 0),
          pricing_type: eventInput.pricing_type || 'free',
          pricing_dropdown_label: eventInput.pricing_dropdown_label || null,
          status: eventInput.status ?? 'approved',
          created_by: user.id,
          assigned_organizer: eventInput.assigned_organizer || null,
          visibility: eventInput.visibility || 'public',
          is_unlimited: !!eventInput.is_unlimited,
          show_capacity: eventInput.show_capacity !== undefined ? !!eventInput.show_capacity : true,
          currency: eventInput.currency || 'INR',
          qfix_link: eventInput.qfix_link || null,
          use_custom_qfix_link: !!eventInput.use_custom_qfix_link,
          use_dual_region_pricing: !!eventInput.use_dual_region_pricing,
          dual_region_label: eventInput.dual_region_label || 'Where are you from?',
          region_labels: eventInput.region_labels || [],
          price_inr: eventInput.price_inr ? Number(eventInput.price_inr) : null,
          price_usd: eventInput.price_usd ? Number(eventInput.price_usd) : null
        }
      });

      // 2. Pricing Options
      if (event.pricing_type === 'custom' && pricingOptions.length > 0) {
        await tx.event_pricing_options.createMany({
          data: pricingOptions.map(opt => ({
            event_id: event.id,
            label: opt.label.trim(),
            price: Number(opt.price),
            currency: opt.currency || eventInput.currency || 'INR'
          }))
        });
      }

      // 3. Form Fields
      if (formFields.length > 0) {
        await tx.event_form_fields.createMany({
          data: formFields.map(field => ({
            id: field.id,
            event_id: event.id,
            label: field.label,
            field_type: field.field_type,
            required: !!field.required,
            options: field.options ?? undefined,
            disabled: !!field.disabled,
            condition: field.condition ?? undefined,
            original_required: typeof field.original_required === 'boolean' ? field.original_required : !!field.required
          }))
        });
      }

      // 4. Log Admin Action
      await tx.admin_logs.create({
        data: {
          admin_id: user.id,
          action: event.pricing_type === 'custom' ? 'CREATE_CUSTOM_PRICING_EVENT' : 'CREATE_EVENT',
          details: { event_id: event.id, title: event.title }
        }
      });

      return event;
    });

    return NextResponse.json({ success: true, event: result }, { status: 200 });

  } catch (error: any) {
    if (error.message === 'Not authorized' || error.message === 'Not authenticated') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Not authorized' ? 403 : 401 });
    }
    console.error('admin create-event API error', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
