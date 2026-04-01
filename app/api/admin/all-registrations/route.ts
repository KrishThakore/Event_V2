import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const registrations = await prisma.registrations.findMany({
    include: {
      event: { select: { id: true, title: true, is_paid: true, price: true } },
      user: { select: { id: true, full_name: true, email: true } }
    },
    orderBy: { created_at: 'desc' }
  });

  const mapped = registrations.map((r: any) => ({
    id: r.id,
    status: r.status,
    entry_code: r.entry_code,
    created_at: r.created_at,
    event_id: r.event_id,
    user_id: r.user_id,
    paid_amount: r.paid_amount,
    currency: r.currency,
    payment_method: r.payment_method,
    pricing_option_id: r.pricing_option_id,
    event: r.event ? { id: r.event.id, title: r.event.title, is_paid: r.event.is_paid, price: r.event.price } : null,
    user: r.user ? { id: r.user.id, full_name: r.user.full_name, email: r.user.email } : null
  }));

  return NextResponse.json({ registrations: JSON.parse(JSON.stringify(mapped)) });
}
