import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { formatToIST, formatDateIST, getISTDateYYYYMMDD } from '@/lib/date';
import { formatINR, formatPrice } from '@/lib/currency';

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
      // Check if the header exists as a direct key first (for custom fields with dots)
      if (Object.prototype.hasOwnProperty.call(row, header)) {
        return escapeCSVField(row[header]);
      }
      // Fallback to nested property access
      const value = header.split('.').reduce((obj: any, key: string) => obj?.[key], row);
      return escapeCSVField(value);
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['admin']);
    const formData = await req.formData();
    const exportType = formData.get('exportType') as string | null;
    const eventId = formData.get('eventId') as string | null;

    if (!exportType) {
      return new Response('Missing exportType', { status: 400 });
    }

    let csvData = '';
    let filename = '';

    if (exportType === 'registrations') {
      const registrations = await prisma.registrations.findMany({
        where: {
          status: { not: 'PENDING' }
        },
        include: {
          user: true,
          event: true,
          payments: { where: { status: 'SUCCESS' } },
          responses: {
            include: { field: true }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      // Get all unique field labels for the headers
      const fieldLabels = new Set<string>();
      registrations.forEach((reg: any) => {
        reg.responses.forEach((resp: any) => {
          if (resp.field?.label) fieldLabels.add(resp.field.label);
        });
      });

      const dynamicHeaders = Array.from(fieldLabels).sort();
      const headers = ['Registration ID', 'User Name', 'User Email', 'User Phone Number', 'User University', ...dynamicHeaders, 'Event Title', 'Event Date', 'Price', 'Status', 'Entry Code', 'Payment Status', 'Razorpay Payment ID', 'Razorpay Order ID', 'Created At'];
      
      const rows = registrations.map((reg: any) => {
        const attendance = reg.attendance;
        const row: any = {
          'Registration ID': reg.id,
          'User Name': reg.user?.full_name || '',
          'User Email': reg.user?.email || '',
          'User Phone Number': reg.phone_number || reg.user?.phone_number || '—',
          'User University': reg.university || reg.user?.university || '—',
          'Event Title': reg.event?.title || '',
          'Event Date': reg.event?.event_date ? formatDateIST(reg.event.event_date) : '',
          'Price': reg.paid_amount ? formatPrice(Number(reg.paid_amount), reg.currency || 'INR') : (Number(reg.event?.price) === 0 ? 'Free' : formatPrice(Number(reg.event?.price), reg.event?.currency || 'INR')),
          'Status': reg.status,
          'Entry Code': reg.entry_code,
          'Payment Status': reg.payments?.[0]?.status || (Number(reg.event?.price) === 0 ? 'FREE' : 'PENDING'),
        };

        // Add dynamic field responses
        dynamicHeaders.forEach(label => {
          const resp = reg.responses.find((r: any) => r.field?.label === label);
          row[label] = resp?.value || '';
        });

        row['Razorpay Payment ID'] = reg.payments?.[0]?.razorpay_payment_id || '—';
        row['Razorpay Order ID'] = reg.payments?.[0]?.razorpay_order_id || '—';

        row['Created At'] = formatToIST(reg.created_at);
        return row;
      });

      csvData = generateCSV(rows, headers);
      filename = `admin-registrations-${getISTDateYYYYMMDD()}.csv`;

    } else if (exportType === 'payments') {
      const payments = await prisma.payments.findMany({
        include: {
          registration: {
            include: { user: true, event: true }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      const headers = ['Payment ID', 'User Name', 'Event Title', 'Amount', 'Status', 'Razorpay Order ID', 'Created At'];
      const rows = payments.map((p: any) => ({
        'Payment ID': p.id,
        'User Name': (p as any).registration?.user?.full_name || '',
        'Event Title': (p as any).registration?.event?.title || '',
        'Amount': formatPrice(Number(p.amount), (p as any).registration?.currency || (p as any).registration?.event?.currency || 'INR'),
        'Status': p.status,
        'Razorpay Order ID': p.razorpay_order_id,
        'Created At': formatToIST(p.created_at)
      }));
      csvData = generateCSV(rows, headers);
      filename = `admin-payments-${getISTDateYYYYMMDD()}.csv`;

    } else if (exportType === 'users') {
      const profiles = await prisma.profiles.findMany({
        orderBy: { created_at: 'desc' }
      });

      const headers = ['User ID', 'Full Name', 'Email', 'Role', 'Created At'];
      const rows = profiles.map((p: any) => ({
        'User ID': p.id,
        'Full Name': p.full_name || '',
        'Email': p.email,
        'Role': p.role,
        'Created At': formatToIST(p.created_at)
      }));
      csvData = generateCSV(rows, headers);
      filename = `admin-users-${getISTDateYYYYMMDD()}.csv`;

    } else if (exportType === 'attendance') {
      const attendance = await prisma.attendance.findMany({
        where: {
          registration: {
            status: { not: 'PENDING' }
          }
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

      // Get all unique field labels for the headers
      const fieldLabels = new Set<string>();
      attendance.forEach((at: any) => {
        at.registration?.responses?.forEach((resp: any) => {
          if (resp.field?.label) fieldLabels.add(resp.field.label);
        });
      });

      const dynamicHeaders = Array.from(fieldLabels).sort();
      const headers = ['Registration ID', 'User Name', 'Email', 'Phone', 'University', ...dynamicHeaders, 'Event Title', 'Check-in Time', 'Scanned By Name', 'Scanned By Email', 'Scanned By Role'];
      
      const rows = attendance.map((at: any) => {
        const row: any = {
          'Registration ID': at.registration_id,
          'User Name': at.registration?.user?.full_name || '',
          'Email': at.registration?.user?.email || '',
          'Phone': at.registration?.phone_number || at.registration?.user?.phone_number || '—',
          'University': at.registration?.university || at.registration?.user?.university || '—',
          'Event Title': at.registration?.event?.title || '',
          'Check-in Time': at.checked_in_at ? formatToIST(at.checked_in_at) : '',
          'Scanned By Name': at.scanned_by_profile?.full_name || 'Unknown',
          'Scanned By Email': at.scanned_by_profile?.email || 'â€”',
          'Scanned By Role': at.scanned_by_role || 'Unknown'
        };

        // Add dynamic field responses
        dynamicHeaders.forEach(label => {
          const resp = at.registration?.responses?.find((r: any) => r.field?.label === label);
          row[label] = resp?.value || '';
        });

        return row;
      });

      csvData = generateCSV(rows, headers);
      filename = `admin-attendance-${getISTDateYYYYMMDD()}.csv`;

    } else if (exportType === 'manual_registrations') {
      const manualRegs = await prisma.registrations.findMany({
        where: {
          OR: [
            { entry_code: { startsWith: 'MAN-' } },
            { entry_code: { startsWith: 'MANUAL-' } }
          ]
        },
        include: { 
          user: true, 
          event: true,
          responses: {
            include: { field: true }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      // Get all unique field labels for the headers
      const fieldLabels = new Set<string>();
      manualRegs.forEach((reg: any) => {
        reg.responses.forEach((resp: any) => {
          if (resp.field?.label) fieldLabels.add(resp.field.label);
        });
      });

      const dynamicHeaders = Array.from(fieldLabels).sort();
      const headers = ['Registration ID', 'User Name', 'Email', 'Phone', 'University', ...dynamicHeaders, 'Event Title', 'Entry Code', 'Status', 'Created At'];
      
      const rows = manualRegs.map((reg: any) => {
        const row: any = {
          'Registration ID': reg.id,
          'User Name': reg.user?.full_name || '',
          'Email': reg.user?.email || '',
          'Phone': reg.phone_number || reg.user?.phone_number || '—',
          'University': reg.university || reg.user?.university || '—',
          'Event Title': reg.event?.title || '',
          'Entry Code': reg.entry_code,
          'Status': reg.status,
        };

        // Add dynamic field responses
        dynamicHeaders.forEach(label => {
          const resp = reg.responses.find((r: any) => r.field?.label === label);
          row[label] = resp?.value || '';
        });

        row['Created At'] = formatToIST(reg.created_at);
        return row;
      });

      csvData = generateCSV(rows, headers);
      filename = `admin-manual-registrations-${getISTDateYYYYMMDD()}.csv`;

    } else if (exportType === 'event_detailed') {
      const where: any = {
        status: { not: 'PENDING' }
      };
      if (eventId && eventId !== 'all') {
        where.event_id = eventId;
      }

      const registrations = await prisma.registrations.findMany({
        where,
        include: {
          user: true,
          event: true,
          payments: { where: { status: 'SUCCESS' } },
          attendance: {
            include: {
              scanned_by_profile: {
                select: {
                  full_name: true,
                  email: true,
                }
              }
            }
          },
          responses: {
            include: { field: true }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      // Get all unique field labels for the headers
      const fieldLabels = new Set<string>();
      registrations.forEach((reg: any) => {
        reg.responses.forEach((resp: any) => {
          if (resp.field?.label) fieldLabels.add(resp.field.label);
        });
      });

      const dynamicHeaders = Array.from(fieldLabels);
      const headers = ['Registration ID', 'User Name', 'Email', 'Phone', 'University', ...dynamicHeaders, 'Event Title', 'Status', 'Paid Amount', 'Attendance Status', 'Check-in Time', 'Scanned By Name', 'Scanned By Email', 'Scanned By Role', 'Razorpay Payment ID', 'Razorpay Order ID', 'Created At'];
      
      const rows = registrations.map((reg: any) => {
        const attendance = reg.attendance;
        const row: any = {
          'Registration ID': reg.id,
          'User Name': reg.user?.full_name || '',
          'Email': reg.user?.email || '',
          'Phone': reg.phone_number || reg.user?.phone_number || '—',
          'University': reg.university || reg.user?.university || '—',
          'Event Title': reg.event?.title || '',
          'Status': reg.status,
          'Paid Amount': reg.paid_amount ? formatPrice(Number(reg.paid_amount), reg.currency || 'INR') : (Number(reg.event?.price) === 0 ? 'Free' : formatPrice(Number(reg.event?.price), reg.event?.currency || 'INR')),
          'Attendance Status': attendance ? 'CHECKED_IN' : 'NOT_CHECKED_IN',
          'Check-in Time': attendance?.checked_in_at ? formatToIST(attendance.checked_in_at) : 'N/A',
          'Scanned By Name': attendance?.scanned_by_profile?.full_name || 'N/A',
          'Scanned By Email': attendance?.scanned_by_profile?.email || 'N/A',
          'Scanned By Role': attendance?.scanned_by_role || 'N/A',
          'Created At': formatToIST(reg.created_at)
        };

        // Add dynamic field responses
        dynamicHeaders.forEach(label => {
          const resp = reg.responses.find((r: any) => r.field?.label === label);
          row[label] = resp?.value || '';
        });

        row['Razorpay Payment ID'] = reg.payments?.[0]?.razorpay_payment_id || '—';
        row['Razorpay Order ID'] = reg.payments?.[0]?.razorpay_order_id || '—';
        
        return row;
      });

      csvData = generateCSV(rows, headers);
      filename = `admin-event-detailed-${getISTDateYYYYMMDD()}.csv`;
    }

    // Log the export action
    await prisma.admin_logs.create({
      data: {
        admin_id: user.id,
        action: 'EXPORT_DATA',
        details: { export_type: exportType, filename }
      }
    });

    return new Response('\uFEFF' + csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error: any) {
    console.error('Admin Export error:', error);
    return new Response(error.message || 'Internal server error', { status: 500 });
  }
}
