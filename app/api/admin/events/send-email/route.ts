import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import nodemailer from 'nodemailer';
import { formatDateIST, formatTimeIST } from '@/lib/date';
import { BRAND_EMAIL_FROM_NAME } from '@/lib/brand';

function getSmtpTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

// Rate limiting: Max 3 sends per event per hour
const rateLimitStore = new Map<string, { count: number; lastSent: number }>();

function checkRateLimit(eventId: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const existing = rateLimitStore.get(eventId);
  if (!existing) { rateLimitStore.set(eventId, { count: 1, lastSent: now }); return { allowed: true }; }
  if (now - existing.lastSent > oneHour) { rateLimitStore.set(eventId, { count: 1, lastSent: now }); return { allowed: true }; }
  if (existing.count >= 3) return { allowed: false, error: 'Rate limit exceeded. Maximum 3 emails per event per hour.' };
  existing.count++;
  existing.lastSent = now;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const transport = getSmtpTransport();
    if (!transport) {
      return NextResponse.json({ error: 'Email service not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in environment variables.' }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { eventId, subject, body } = await request.json();
    if (!eventId || !subject || !body) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const rateLimit = checkRateLimit(eventId);
    if (!rateLimit.allowed) return NextResponse.json({ error: rateLimit.error }, { status: 429 });

    const event = await prisma.events.findUnique({ 
      where: { id: eventId }, 
      select: { title: true, event_date: true, start_time: true, end_time: true } 
    });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const registrations = await prisma.registrations.findMany({
      where: { event_id: eventId, status: 'CONFIRMED' },
      include: { user: { select: { email: true, full_name: true } } }
    });

    const withEmail = registrations.filter((r: any) => r.user?.email);
    if (withEmail.length === 0) return NextResponse.json({ error: 'No confirmed participants found' }, { status: 404 });
    if (withEmail.length > 5000) return NextResponse.json({ error: 'Too many recipients. Maximum 5000 recipients allowed.' }, { status: 400 });

    // Process emails in batches of 150
    const batchSize = 150;
    let successCount = 0;

    for (let i = 0; i < withEmail.length; i += batchSize) {
      const batch = withEmail.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (reg: any) => {
          const toEmail = reg.user!.email;
          const participantName = reg.user!.full_name || 'Participant';
          const startTime = formatTimeIST(event.start_time);
          const endTime = formatTimeIST(event.end_time);
          const personalizedBody = body
            .replace(/\{\{event_name\}\}/g, event.title)
            .replace(/\{\{event_date\}\}/g, formatDateIST(event.event_date))
            .replace(/\{\{event_start_time\}\}/g, startTime)
            .replace(/\{\{event_end_time\}\}/g, endTime)
            .replace(/\{\{event_time\}\}/g, `${startTime} to ${endTime}`)
            .replace(/\{\{participant_name\}\}/g, participantName);
          await transport.sendMail({ from: `"${BRAND_EMAIL_FROM_NAME}" <${process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@joulesevents.com'}>`, to: toEmail!, subject, html: personalizedBody });
        })
      );
      successCount += results.filter(r => r.status === 'fulfilled').length;
      if (i + batchSize < withEmail.length) await new Promise(r => setTimeout(r, 1000));
    }

    // Record email in DB
    await prisma.event_emails.create({ data: { event_id: eventId, sent_by: session.user.id, sender_role: 'admin', subject, body_html: body, recipient_count: successCount } });
    await prisma.admin_logs.create({ data: { admin_id: session.user.id, action: 'SEND_EVENT_EMAIL', details: { event_id: eventId, subject, recipient_count: successCount, total_recipients: withEmail.length } } });

    return NextResponse.json({ success: true, recipientCount: successCount, totalRecipients: withEmail.length, message: `Email sent to ${successCount} of ${withEmail.length} confirmed participants` });
  } catch (error: any) {
    console.error('API admin events/send-email Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
