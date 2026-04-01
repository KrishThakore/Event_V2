import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import nodemailer from 'nodemailer';
import { formatDateIST, formatTimeIST } from '@/lib/date';
import { BRAND_EMAIL_FROM_NAME } from '@/lib/brand';

function getSmtpTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

// Simple in-memory rate limiting (matches original implementation)
const rateLimitStore = new Map<string, { count: number; lastSent: number }>();

function checkRateLimit(eventId: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  const existing = rateLimitStore.get(eventId);
  
  if (!existing || (now - existing.lastSent > oneHour)) {
    rateLimitStore.set(eventId, { count: 1, lastSent: now });
    return { allowed: true };
  }
  
  if (existing.count >= 3) {
    return { 
      allowed: false, 
      error: 'Rate limit exceeded. Maximum 3 emails per event per hour.' 
    };
  }
  
  existing.count++;
  existing.lastSent = now;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['organizer', 'admin']);
    const transport = getSmtpTransport();

    if (!transport) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    const { eventId, subject, body } = await request.json();

    if (!eventId || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership
    const event = await prisma.events.findUnique({
      where: { id: eventId },
      select: { title: true, event_date: true, created_by: true, assigned_organizer: true, start_time: true, end_time: true }
    });

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    
    const isOwned = event.created_by === user.id || event.assigned_organizer === user.id;
    if (!isOwned && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limiting
    const limit = checkRateLimit(eventId);
    if (!limit.allowed) return NextResponse.json({ error: limit.error }, { status: 429 });

    // Get recipients
    const registrations = await prisma.registrations.findMany({
      where: {
        event_id: eventId,
        status: 'CONFIRMED'
      },
      include: {
        user: {
          select: { email: true, full_name: true }
        }
      }
    });

    const confirmedRecipients = registrations.filter((r: any) => r.user?.email);

    if (confirmedRecipients.length === 0) {
      return NextResponse.json({ error: 'No confirmed participants found' }, { status: 404 });
    }

    // Batch sending (simplified logic preserved)
    let successCount = 0;
    const batchSize = 50; // Increased safety from 150

    for (let i = 0; i < confirmedRecipients.length; i += batchSize) {
      const batch = confirmedRecipients.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (reg: any) => {
        const participantName = reg.user?.full_name || 'Participant';
        const toEmail = reg.user?.email!;

        const startTime = formatTimeIST(event.start_time);
        const endTime = formatTimeIST(event.end_time);
        const personalizedBody = body
          .replace(/\{\{event_name\}\}/g, event.title)
          .replace(/\{\{event_date\}\}/g, formatDateIST(event.event_date))
          .replace(/\{\{event_start_time\}\}/g, startTime)
          .replace(/\{\{event_end_time\}\}/g, endTime)
          .replace(/\{\{event_time\}\}/g, `${startTime} to ${endTime}`)
          .replace(/\{\{participant_name\}\}/g, participantName);

        try {
          await transport.sendMail({
            from: `"${BRAND_EMAIL_FROM_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: toEmail,
            subject,
            html: personalizedBody,
          });
          return true;
        } catch (err) {
          console.error(`Failed to send email to ${toEmail}:`, err);
          return false;
        }
      });

      const results = await Promise.all(emailPromises);
      successCount += results.filter(Boolean).length;

      if (i + batchSize < confirmedRecipients.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Log and record
    await prisma.$transaction([
      prisma.event_emails.create({
        data: {
          event_id: eventId,
          sent_by: user.name || user.email!,
          sender_role: user.role,
          subject,
          body_html: body,
          recipient_count: successCount
        }
      }),
      prisma.organizer_logs.create({
        data: {
          organizer_id: user.id,
          action: 'SEND_EVENT_EMAIL',
          details: {
            event_id: eventId,
            subject,
            recipient_count: successCount,
            total_recipients: confirmedRecipients.length
          }
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      recipientCount: successCount,
      totalRecipients: confirmedRecipients.length,
      message: `Email sent to ${successCount} of ${confirmedRecipients.length} participants`
    });

  } catch (error: any) {
    console.error('API send-email Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
