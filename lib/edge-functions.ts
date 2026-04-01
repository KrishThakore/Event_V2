import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function checkIn(params: { registration_id: string; entry_code: string }) {
  const { registration_id, entry_code } = params;
  console.log('[edge] checkIn called', { registration_id, entry_code });

  // Check if registration exists and entry code matches using Prisma
  const registration = await prisma.registrations.findFirst({
    where: {
      id: registration_id,
      entry_code: entry_code
    }
  });

  console.log('[edge] registration lookup', { registration });

  if (!registration) {
    throw new Error('Invalid registration or entry code');
  }

  // Insert attendance row
  const attendance = await prisma.attendance.create({
    data: {
      registration_id: registration_id
    }
  });

  console.log('[edge] attendance recorded', attendance);

  return { success: true };
}

export async function registerForEvent(params: { event_id: string; user_id: string }) {
  const { event_id, user_id } = params;

  // Check if event exists and is active
  const event = await prisma.events.findUnique({
    where: { id: event_id }
  });

  if (!event) {
    throw new Error('Event not found');
  }

  // Check if user is already registered
  const existingRegistration = await prisma.registrations.findFirst({
    where: {
      event_id: event_id,
      user_id: user_id
    }
  });

  if (existingRegistration) {
    throw new Error('Already registered for this event');
  }

  console.log('[edge] creating registration', { event_id, user_id });

  // Generate a random entry code
  const entry_code = `REG-${uuidv4().split('-')[0].toUpperCase()}`;

  // Create registration
  const registration = await prisma.registrations.create({
    data: {
      event_id,
      user_id,
      status: 'PENDING',
      entry_code: entry_code
    }
  });

  console.log('[edge] registration result', { registration });

  return { success: true, registration };
}
