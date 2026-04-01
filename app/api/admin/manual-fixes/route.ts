import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const adminId = session.user.id;
  const body = await req.json();
  const { action, paymentId, userEmail, eventId, offlineEventId, offlineUserName, offlineUserEmail, offlinePhoneNumber, offlineUniversityType, offlineGanpatInstitute, offlineOtherUniversity } = body;

  const genCode = () => `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  try {
    if (action === 'fix_payment_success_but_registration_missing' && paymentId) {
      const payment = await prisma.payments.findUnique({ 
        where: { id: paymentId }, 
        select: { 
          id: true, 
          amount: true, 
          razorpay_payment_id: true,
          registration: {
            select: {
              user_id: true,
              event_id: true
            }
          }
        } 
      });
      
      if (payment?.registration?.user_id && payment.registration.event_id) {
        const { user_id, event_id } = payment.registration;
        const existing = await prisma.registrations.findFirst({ where: { user_id, event_id } });
        if (!existing || existing.status !== 'CONFIRMED') {
          const entryCode = genCode();
          if (!existing) {
            const newReg = await prisma.registrations.create({ data: { user_id, event_id, status: 'CONFIRMED', entry_code: entryCode } });
            await prisma.admin_logs.create({ data: { admin_id: adminId, action: 'MANUAL_FIX_PAYMENT_SUCCESS_BUT_REG_MISSING', details: { payment_id: paymentId, user_id, event_id, amount: Number(payment.amount), razorpay_payment_id: payment.razorpay_payment_id, registration_id: newReg.id, entry_code: entryCode } } });
          } else {
            await prisma.registrations.update({ where: { id: existing.id }, data: { status: 'CONFIRMED', entry_code: entryCode } });
            await prisma.admin_logs.create({ data: { admin_id: adminId, action: 'MANUAL_FIX_REGISTRATION_STATUS_UPDATE', details: { payment_id: paymentId, registration_id: existing.id, user_id, event_id, amount: Number(payment.amount), razorpay_payment_id: payment.razorpay_payment_id, entry_code: entryCode } } });
          }
          return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'Registration already confirmed' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid payment or registration reference' }, { status: 400 });
    }

    if (action === 'add_user_manually' && userEmail && eventId) {
      const userProfile = await prisma.profiles.findFirst({ where: { email: userEmail }, select: { id: true, full_name: true } });
      if (userProfile) {
        const existing = await prisma.registrations.findFirst({ where: { user_id: userProfile.id, event_id: eventId } });
        if (!existing) {
          const entryCode = genCode();
          const newReg = await prisma.registrations.create({ data: { user_id: userProfile.id, event_id: eventId, status: 'CONFIRMED', entry_code: entryCode } });
          await prisma.admin_logs.create({ data: { admin_id: adminId, action: 'MANUAL_ADD_USER_INTERNET_FAILED', details: { user_email: userEmail, user_id: userProfile.id, event_id: eventId, registration_id: newReg.id, entry_code: entryCode } } });
          return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'User already registered' }, { status: 400 });
      }
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (action === 'add_offline_registration' && offlineEventId && offlineUserName && offlineUserEmail && offlinePhoneNumber && offlineUniversityType) {
      let universityValue = '';
      if (offlineUniversityType === 'Partner Institution' && offlineGanpatInstitute) universityValue = `Partner Institution - ${offlineGanpatInstitute}`;
      else if (offlineUniversityType === 'Other' && offlineOtherUniversity) universityValue = offlineOtherUniversity;

      let userProfile = await prisma.profiles.findFirst({ where: { email: offlineUserEmail }, select: { id: true, full_name: true } });
      if (!userProfile) {
        userProfile = await prisma.profiles.create({
          data: {
            id: randomUUID(),
            email: offlineUserEmail,
            full_name: offlineUserName,
            phone_number: offlinePhoneNumber,
            university: universityValue,
            role: 'student'
          },
          select: { id: true, full_name: true }
        });
      }
      
      if (userProfile) {
        const existing = await prisma.registrations.findFirst({ where: { user_id: userProfile.id, event_id: offlineEventId } });
        if (!existing) {
          const entryCode = genCode();
          const newReg = await prisma.registrations.create({ data: { user_id: userProfile.id, event_id: offlineEventId, status: 'CONFIRMED', entry_code: entryCode } });
          await prisma.admin_logs.create({ data: { admin_id: adminId, action: 'MANUAL_OFFLINE_REGISTRATION', details: { user_email: offlineUserEmail, user_name: offlineUserName, phone_number: offlinePhoneNumber, university: universityValue, user_id: userProfile.id, event_id: offlineEventId, registration_id: newReg.id, entry_code: entryCode } } });
          return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'User already registered for this event' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Invalid action or missing fields' }, { status: 400 });
  } catch (error: any) {
    console.error('API Manual Fix Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
