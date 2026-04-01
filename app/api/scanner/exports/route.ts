import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { formatToIST, getISTDateYYYYMMDD } from '@/lib/date';
import { getAttendanceAccessibleEventIds } from '@/lib/attendance-access';

function escapeCSVField(field: any): string {
  if (field === null || field === undefined) return '';
  const stringField = String(field);
  if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

function generateCSV(data: any[], headers: string[]): string {
  const csvRows = [];
  csvRows.push(headers.map(escapeCSVField).join(','));
  for (const row of data) {
    const values = headers.map((header) => {
      if (Object.prototype.hasOwnProperty.call(row, header)) {
        return escapeCSVField(row[header]);
      }
      const value = header.split('.').reduce((obj: any, key: string) => obj?.[key], row);
      return escapeCSVField(value);
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['scanner']);
    const formData = await req.formData();
    const exportType = formData.get('exportType') as string | null;
    const eventId = formData.get('eventId') as string | null;

    if (!exportType) {
      return new Response('Missing exportType', { status: 400 });
    }

    const accessibleEventIds = await getAttendanceAccessibleEventIds(user.id, 'scanner');

    if (accessibleEventIds.length === 0) {
      return new Response('No assigned events found for scanner', { status: 403 });
    }

    let targetEventIds = accessibleEventIds;
    if (exportType === 'scanned_entries_by_event') {
      if (!eventId || eventId === 'all') {
        return new Response('Missing eventId', { status: 400 });
      }
      if (!accessibleEventIds.includes(eventId)) {
        return new Response('Forbidden', { status: 403 });
      }
      targetEventIds = [eventId];
    }

    if (!['scanned_entries_all', 'scanned_entries_by_event'].includes(exportType)) {
      return new Response('Unknown export type', { status: 400 });
    }

    const attendance = await prisma.attendance.findMany({
      where: {
        scanned_by_id: user.id,
        registration: {
          event_id: { in: targetEventIds },
        },
      },
      include: {
        scanned_by_profile: {
          select: {
            full_name: true,
            email: true,
          }
        },
        registration: {
          include: {
            user: true,
            event: true,
            responses: {
              include: { field: true }
            }
          }
        }
      },
      orderBy: { checked_in_at: 'desc' }
    });

    const fieldLabels = new Set<string>();
    attendance.forEach((at: any) => {
      at.registration?.responses?.forEach((resp: any) => {
        if (resp.field?.label) fieldLabels.add(resp.field.label);
      });
    });

    const dynamicHeaders = Array.from(fieldLabels).sort();
    const headers = [
      'Registration ID',
      'User Name',
      'Email',
      'Phone',
      'University',
      ...dynamicHeaders,
      'Event Title',
      'Entry Code',
      'Check-in Time',
      'Scanned By Name',
      'Scanned By Email',
      'Scanned By Role'
    ];

    const rows = attendance.map((at: any) => {
      const row: any = {
        'Registration ID': at.registration_id,
        'User Name': at.registration?.user?.full_name || '',
        'Email': at.registration?.user?.email || '',
        'Phone': at.registration?.phone_number || at.registration?.user?.phone_number || '—',
        'University': at.registration?.university || at.registration?.user?.university || '—',
        'Event Title': at.registration?.event?.title || '',
        'Entry Code': at.registration?.entry_code || '—',
        'Check-in Time': at.checked_in_at ? formatToIST(at.checked_in_at) : '',
        'Scanned By Name': at.scanned_by_profile?.full_name || 'Unknown',
        'Scanned By Email': at.scanned_by_profile?.email || '—',
        'Scanned By Role': at.scanned_by_role || 'Unknown',
      };

      dynamicHeaders.forEach((label) => {
        const resp = at.registration?.responses?.find((r: any) => r.field?.label === label);
        row[label] = resp?.value || '';
      });

      return row;
    });

    const csvData = generateCSV(rows, headers);
    const filename = exportType === 'scanned_entries_by_event' && targetEventIds.length === 1
      ? `scanner-event-${targetEventIds[0]}-attendance-${getISTDateYYYYMMDD()}.csv`
      : `scanner-all-events-attendance-${getISTDateYYYYMMDD()}.csv`;

    await prisma.organizer_logs.create({
      data: {
        organizer_id: user.id,
        action: 'EXPORT_SCANNED_ATTENDANCE',
        details: {
          export_type: exportType,
          filename,
          event_ids: targetEventIds,
          actor_role: 'scanner',
        }
      }
    });

    return new Response('\uFEFF' + csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    });
  } catch (error: any) {
    console.error('Scanner export error:', error);
    return new Response(error.message || 'Internal server error', { status: 500 });
  }
}
