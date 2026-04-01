'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseTimeToDate } from '@/lib/date';
import { serializePrisma } from '@/lib/serialize';

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

export async function updateEventAction(params: {
  eventId: string;
  event: {
    title: string;
    description: string;
    location: string;
    event_date: string;
    start_time: string;
    end_time: string;
    capacity: number;
    is_registration_open: boolean;
    price: number;
    pricing_type?: 'free' | 'paid' | 'custom';
    pricing_dropdown_label?: string | null;
    status: 'approved' | 'draft' | 'cancelled';
    visibility: 'public' | 'hidden';
    assigned_organizer: string | null;
    image_url?: string | null;
    is_unlimited_capacity?: boolean;
    show_capacity?: boolean;
    currency?: string;
    qfix_link?: string | null;
    use_custom_qfix_link?: boolean;
    use_dual_region_pricing?: boolean;
    dual_region_label?: string;
    region_labels?: any;
    price_inr?: number | null;
    price_usd?: number | null;
  };
  pricing_options?: Array<{ id?: string; label: string; price: number; currency?: string; price_inr?: number; price_usd?: number }>;
  form_fields: IncomingFormField[];
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { success: false, error: 'Not authorized' };
  }

  const userId = session.user.id;
  const existingEvent = await prisma.events.findUnique({ where: { id: params.eventId } });
  if (!existingEvent) return { success: false, error: 'Event not found' };

  const normalizedCapacity = Number(params.event.capacity ?? 0);
  if (!Number.isFinite(normalizedCapacity) || normalizedCapacity <= 0) return { success: false, error: 'Capacity must be greater than 0' };
  if (!params.event.event_date || !params.event.start_time || !params.event.end_time) return { success: false, error: 'Missing required date/time fields' };

  const start = new Date(`2000-01-01T${params.event.start_time}`);
  const end = new Date(`2000-01-01T${params.event.end_time}`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return { success: false, error: 'End time must be after start time' };

  const confirmedCount = await prisma.registrations.count({ where: { event_id: params.eventId, status: 'CONFIRMED' } });
  if (confirmedCount > normalizedCapacity) {
    return { success: false, error: 'Capacity is lower than confirmed registrations', code: 'CAPACITY_BELOW_CONFIRMED', confirmed_registrations: confirmedCount };
  }

  const now = new Date();

  // Form fields sync
  const existingFields = await prisma.event_form_fields.findMany({ where: { event_id: params.eventId }, select: { id: true, original_required: true, disabled: true } });
  const existingById = new Map<string, { id: string; original_required: boolean | null; disabled: boolean | null }>(existingFields.map((f: any) => [f.id, f]));
  const incomingById = new Map<string, IncomingFormField>((params.form_fields ?? []).filter(f => f.id).map(f => [f.id!, f]));

  // Disable removed fields
  for (const [id, existing] of existingById) {
    if (!incomingById.has(id as string) && !existing.disabled) {
      await prisma.event_form_fields.update({ where: { id: id as string }, data: { disabled: true, disabled_by: userId, disabled_at: now } });
    }
  }

  // Update existing fields
  for (const [id, incoming] of incomingById) {
    if (!existingById.has(id)) continue;
    const existing = existingById.get(id)!;
    const required = !!incoming.required;
    const disabled = !!incoming.disabled;
    const originalRequired = typeof existing.original_required === 'boolean' ? existing.original_required : (typeof incoming.original_required === 'boolean' ? incoming.original_required : required);
    const isOverridden = originalRequired !== required;
    await (prisma.event_form_fields.update as any)({ where: { id }, data: { label: incoming.label, field_type: incoming.field_type, required, options: incoming.options ?? [], condition: incoming.condition ?? undefined, disabled, original_required: originalRequired, overridden_by: isOverridden ? userId : null, overridden_at: isOverridden ? now : null } });
}

  // Insert new fields
  const newFields = (params.form_fields ?? []).filter(f => !f.id || !existingById.has(f.id));
  if (newFields.length > 0) {
    await prisma.event_form_fields.createMany({
      data: newFields.map(field => {
        const required = !!field.required;
        const disabled = !!field.disabled;
        const originalRequired = typeof field.original_required === 'boolean' ? field.original_required : required;
        const isOverridden = originalRequired !== required;
        return { event_id: params.eventId, label: field.label, field_type: field.field_type, required, options: field.options ?? [], condition: field.condition ?? undefined, disabled, disabled_by: disabled ? userId : null, disabled_at: disabled ? now : null, original_required: originalRequired, overridden_by: isOverridden ? userId : null, overridden_at: isOverridden ? now : null };
      })
    });
  }

  // Update event
  const updatedEvent = await prisma.events.update({
    where: { id: params.eventId },
    data: {
      title: params.event.title,
      description: params.event.description,
      location: params.event.location,
      event_date: new Date(params.event.event_date),
      start_time: parseTimeToDate(params.event.start_time),
      end_time: parseTimeToDate(params.event.end_time),
      capacity: normalizedCapacity,
      is_registration_open: !!params.event.is_registration_open,
      price: Number(params.event.price ?? 0),
      is_paid: params.event.pricing_type === 'paid' || params.event.pricing_type === 'custom',
      event_type: params.event.pricing_type || 'free',
      pricing_type: params.event.pricing_type,
      pricing_dropdown_label: params.event.pricing_dropdown_label,
      status: params.event.status,
      assigned_organizer: params.event.assigned_organizer,
      visibility: params.event.visibility,
      is_unlimited: params.event.is_unlimited_capacity ?? false,
      show_capacity: params.event.show_capacity ?? true,
      currency: params.event.currency || 'INR',
      qfix_link: params.event.qfix_link ?? null,
      use_custom_qfix_link: params.event.use_custom_qfix_link ?? false,
      use_dual_region_pricing: params.event.use_dual_region_pricing ?? false,
      dual_region_label: params.event.dual_region_label ?? 'Where are you from?',
      region_labels: params.event.region_labels || [],
      price_inr: params.event.price_inr != null ? Number(params.event.price_inr) : null,
      price_usd: params.event.price_usd != null ? Number(params.event.price_usd) : null,
      ...(params.event.image_url !== undefined && { image_url: params.event.image_url })
    } as any
  });

  // Handle pricing options
  await prisma.event_pricing_options.deleteMany({ where: { event_id: params.eventId } });
  if (params.event.pricing_type === 'custom' && params.pricing_options && params.pricing_options.length > 0) {
    await prisma.event_pricing_options.createMany({ 
      data: params.pricing_options.map(opt => ({ 
        event_id: params.eventId, 
        label: opt.label.trim(), 
        price: Number(opt.price), 
        currency: opt.currency || params.event.currency || 'INR',
        price_inr: opt.price_inr ? Number(opt.price_inr) : null,
        price_usd: opt.price_usd ? Number(opt.price_usd) : null
      })) 
    });
  }

  await prisma.admin_logs.create({ data: { admin_id: userId, action: 'UPDATE_EVENT', details: { event_id: params.eventId, timestamp: now.toISOString() } } });

  return { success: true, event: serializePrisma(updatedEvent) as any };
}
