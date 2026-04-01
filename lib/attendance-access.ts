import { prisma } from '@/lib/prisma';

export type AttendanceActorRole = 'admin' | 'organizer' | 'scanner' | string;

export async function getAttendanceAccessibleEventIds(userId: string, role: AttendanceActorRole) {
  if (role === 'admin') {
    const events = await prisma.events.findMany({ select: { id: true } });
    return events.map((event) => event.id);
  }

  if (role === 'organizer') {
    const events = await prisma.events.findMany({
      where: { OR: [{ created_by: userId }, { assigned_organizer: userId }] },
      select: { id: true },
    });
    return events.map((event) => event.id);
  }

  if (role === 'scanner') {
    const assignments = await prisma.event_scanner_assignments.findMany({
      where: { scanner_id: userId },
      select: { event_id: true },
    });
    return assignments.map((assignment) => assignment.event_id);
  }

  return [];
}

export async function canManageAttendanceEvent(userId: string, role: AttendanceActorRole, eventId: string | null) {
  if (!eventId) return false;

  if (role === 'admin') return true;

  if (role === 'organizer') {
    const event = await prisma.events.findUnique({
      where: { id: eventId },
      select: { created_by: true, assigned_organizer: true },
    });
    return !!event && (event.created_by === userId || event.assigned_organizer === userId);
  }

  if (role === 'scanner') {
    const assignment = await prisma.event_scanner_assignments.findUnique({
      where: {
        event_id_scanner_id: {
          event_id: eventId,
          scanner_id: userId,
        },
      },
      select: { id: true },
    });
    return !!assignment;
  }

  return false;
}
