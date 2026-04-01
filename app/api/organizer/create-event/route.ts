import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { parseTimeToDate } from '@/lib/date';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['organizer', 'admin']);

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

    if (!eventInput.title || !eventInput.event_date || !eventInput.start_time || !eventInput.end_time || !eventInput.image_url) {
      return NextResponse.json({ success: false, error: 'Missing required event fields' }, { status: 400 });
    }

    // Time validation
    const start = new Date(`2000-01-01T${eventInput.start_time}`);
    const end = new Date(`2000-01-01T${eventInput.end_time}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ success: false, error: 'End time must be after start time' }, { status: 400 });
    }

    const capacity = Number(eventInput.capacity ?? 0);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return NextResponse.json({ success: false, error: 'Capacity must be greater than 0' }, { status: 400 });
    }

    // Pricing validation
    const pricingType = eventInput.pricing_type || (eventInput.price > 0 ? 'paid' : 'free');
    let price = Number(eventInput.price ?? 0);

    if (pricingType === 'paid') {
      if (price < 1) {
        return NextResponse.json({ success: false, error: 'Minimum price for paid events is ₹1' }, { status: 400 });
      }
    } else if (pricingType === 'free') {
      price = 0;
    } else if (pricingType === 'custom') {
      if (!eventInput.pricing_dropdown_label?.trim()) {
        return NextResponse.json({ success: false, error: 'Dropdown label is required for custom pricing' }, { status: 400 });
      }
      if (!Array.isArray(pricingOptions) || pricingOptions.length === 0) {
        return NextResponse.json({ success: false, error: 'At least one pricing option required' }, { status: 400 });
      }
    }

    const saveMode = eventInput.save_mode === 'submit_for_approval' ? 'submit_for_approval' : 'draft';
    const status = saveMode === 'submit_for_approval' ? 'pending_approval' : 'draft';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Event
      const event = await tx.events.create({
        data: {
          title: eventInput.title,
          description: eventInput.description,
          location: eventInput.location,
          event_date: new Date(eventInput.event_date),
          start_time: start,
          end_time: end,
          image_url: eventInput.image_url,
          capacity,
          is_registration_open: false,
          price,
          pricing_type: pricingType,
          pricing_dropdown_label: pricingType === 'custom' ? eventInput.pricing_dropdown_label : null,
          status,
          created_by: user.id,
          assigned_organizer: user.id,
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

      // 2. Insert Pricing Options
      if (pricingType === 'custom' && pricingOptions.length > 0) {
        await tx.event_pricing_options.createMany({
          data: pricingOptions.map((option) => ({
            event_id: event.id,
            label: option.label.trim(),
            price: Number(option.price),
            currency: option.currency || eventInput.currency || 'INR'
          }))
        });
      }

      // 3. Insert Form Fields
      if (formFields.length > 0) {
        await tx.event_form_fields.createMany({
          data: formFields.map((field) => ({
            event_id: event.id,
            label: field.label,
            field_type: field.field_type,
            required: !!field.required,
            options: field.options ?? undefined,
            disabled: false,
            original_required: typeof field.original_required === 'boolean' ? field.original_required : !!field.required
          }))
        });
      }

      // 4. Log Action
      await tx.organizer_logs.create({
        data: {
          organizer_id: user.id,
          action: saveMode === 'submit_for_approval' ? 'SUBMIT_FOR_APPROVAL' : 'CREATE_EVENT',
          details: {
            event_id: event.id,
            status,
            pricing_type: pricingType
          }
        }
      });

      return event;
    });

    return NextResponse.json({ success: true, event: result }, { status: 200 });
  } catch (error: any) {
    if (error.message === 'Not authorized' || error.message === 'Not authenticated') {
      return NextResponse.json({ success: false, error: error.message }, { status: error.message === 'Not authorized' ? 403 : 401 });
    }
    console.error('organizer create-event API error', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
