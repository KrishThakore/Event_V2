import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { action, eventId, fieldId } = body;

  if (!action || !eventId || !fieldId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const event = await prisma.events.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const now = new Date();
    let logAction = '';

    if (action === 'disable_field') {
      await prisma.event_form_fields.update({ where: { id: fieldId }, data: { disabled: true, disabled_by: session.user.id, disabled_at: now } });
      logAction = 'FORM_FIELD_DISABLE';
    } else if (action === 'enable_field') {
      await prisma.event_form_fields.update({ where: { id: fieldId }, data: { disabled: false, disabled_by: null, disabled_at: null } });
      logAction = 'FORM_FIELD_ENABLE';
    } else if (action === 'override_field_required') {
      await prisma.event_form_fields.update({ where: { id: fieldId }, data: { required: true, overridden_by: session.user.id, overridden_at: now } });
      logAction = 'FORM_FIELD_OVERRIDE_REQUIRED';
    } else if (action === 'remove_field_override') {
      const field = await prisma.event_form_fields.findUnique({ where: { id: fieldId }, select: { original_required: true } });
      await prisma.event_form_fields.update({ where: { id: fieldId }, data: { required: field?.original_required ?? false, overridden_by: null, overridden_at: null } });
      logAction = 'FORM_FIELD_REMOVE_OVERRIDE';
    }

    if (logAction) {
      await prisma.admin_logs.create({ data: { admin_id: session.user.id, action: logAction, details: { event_id: eventId, field_id: fieldId } } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Form Control API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
