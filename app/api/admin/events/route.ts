import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() || '';
  const month = searchParams.get('month') || 'all';
  const page = parseInt(searchParams.get('page') || '1') || 1;
  const limit = parseInt(searchParams.get('limit') || '10') || 10;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
      { id: { contains: search, mode: 'insensitive' } }
    ];
  }


  if (month !== 'all') {
    const now = new Date();
    if (month === 'this-month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      where.event_date = { gte: start, lte: end };
    } else if (month === 'last-month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      where.event_date = { gte: start, lte: end };
    } else if (month === 'this-year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      where.event_date = { gte: start, lte: end };
    }
  }

  const [eventsData, totalCount, organizers] = await Promise.all([
    prisma.events.findMany({
      where,
      select: { id: true, title: true, description: true, location: true, event_date: true, start_time: true, end_time: true, capacity: true, is_registration_open: true, status: true, created_by: true, assigned_organizer: true, image_url: true },
      orderBy: { event_date: 'asc' },
      take: limit,
      skip: skip
    }),
    prisma.events.count({ where }),
    prisma.profiles.findMany({ select: { id: true, full_name: true } })
  ]);

  const eventIds = eventsData.map(e => e.id);
  const registrations = await prisma.registrations.findMany({
    where: { event_id: { in: eventIds } },
    select: { event_id: true, status: true }
  });

  const usageMap = new Map<string, { pending: number; confirmed: number }>();
  for (const r of registrations) {
    const key = r.event_id!;
    const entry = usageMap.get(key) ?? { pending: 0, confirmed: 0 };
    if (r.status === 'PENDING') entry.pending += 1;
    if (r.status === 'CONFIRMED') entry.confirmed += 1;
    usageMap.set(key, entry);
  }

  const orgMap = new Map<string, string>();
  for (const o of organizers) {
    orgMap.set(o.id, o.full_name ?? 'Organizer');
  }

  const eventsWithUsage = eventsData.map((e: any) => {
    const usage = usageMap.get(e.id) ?? { pending: 0, confirmed: 0 };
    const total = usage.pending + usage.confirmed;
    const capacity = Number(e.capacity ?? 0);
    const utilization = capacity > 0 ? Math.min(100, Math.round((total / capacity) * 100)) : 0;
    const seatsLeft = Math.max(0, capacity - total);
    return { ...e, organizerName: orgMap.get(e.assigned_organizer ?? e.created_by ?? '') ?? 'Unknown', pendingCount: usage.pending, confirmedCount: usage.confirmed, utilization, seatsLeft };
  });

  return NextResponse.json({ 
    events: eventsWithUsage,
    totalCount,
    currentPage: page
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { action, eventId } = await req.json();
  if (!action || !eventId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const event = await prisma.events.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const adminId = session.user.id;
  const updates: Record<string, any> = {};
  let logAction = '';

  if (action === 'approve') { updates.status = 'approved'; logAction = 'EVENT_APPROVE'; }
  else if (action === 'cancel') { updates.status = 'cancelled'; updates.is_registration_open = false; logAction = 'EVENT_CANCEL'; }
  else if (action === 'open_reg') { updates.is_registration_open = true; logAction = 'EVENT_OPEN_REG'; }
  else if (action === 'close_reg') { updates.is_registration_open = false; logAction = 'EVENT_CLOSE_REG'; }
  else if (action === 'delete') {
    await prisma.events.delete({ where: { id: eventId } });
    await prisma.admin_logs.create({ data: { admin_id: adminId, action: 'EVENT_DELETE', details: { event_id: eventId } } });
    return NextResponse.json({ success: true });
  } else if (action === 'clone_event') {
    const formFields = await prisma.event_form_fields.findMany({ where: { event_id: eventId } });
    const pricingOptions = await prisma.event_pricing_options.findMany({ where: { event_id: eventId } });
    const cloned = await prisma.$transaction(async (tx: any) => {
      const clonedEvent = await tx.events.create({
        data: {
          title: `${event.title} (Copy)`, description: event.description, location: event.location,
          event_date: new Date(), start_time: event.start_time, end_time: event.end_time,
          capacity: event.capacity, is_registration_open: false, status: 'draft',
          price: event.price, is_paid: event.is_paid, pricing_type: event.pricing_type,
          created_by: adminId
        }
      });
      if (formFields.length > 0) {
        await tx.event_form_fields.createMany({ data: formFields.map((f: any) => ({ event_id: clonedEvent.id, label: f.label, field_type: f.field_type, required: f.required, options: f.options ?? undefined, disabled: false })) });
      }
      if (pricingOptions.length > 0) {
        await tx.event_pricing_options.createMany({ data: pricingOptions.map((p: any) => ({ event_id: clonedEvent.id, label: p.label, price: p.price })) });
      }
      await tx.admin_logs.create({ data: { admin_id: adminId, action: 'EVENT_CLONE', details: { original_event_id: eventId, cloned_event_id: clonedEvent.id, original_title: event.title } } });
      return clonedEvent;
    });
    return NextResponse.json({ success: true, clonedEventId: cloned.id });
  }

  if (Object.keys(updates).length > 0) {
    await prisma.events.update({ where: { id: eventId }, data: updates });
    await prisma.admin_logs.create({ data: { admin_id: adminId, action: logAction, details: { event_id: eventId, updates } } });
  }

  return NextResponse.json({ success: true });
}
