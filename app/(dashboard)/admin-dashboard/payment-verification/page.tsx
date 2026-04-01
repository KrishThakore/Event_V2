import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PaymentVerificationClient from './PaymentVerificationClient';

export const revalidate = 0;

export default async function AdminPaymentVerificationPage({ 
  searchParams 
}: { 
  searchParams: { page?: string, filter?: string } 
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const page = parseInt(searchParams.page ?? '1') || 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const filter = searchParams.filter || 'all';

  const where: any = {
    payment_method: 'qfix'
  };

  if (filter === 'pending') {
    where.status = 'PENDING_VERIFICATION';
  } else if (filter === 'rejected') {
    where.status = 'REJECTED';
  } else {
    where.status = { in: ['PENDING_VERIFICATION', 'REJECTED'] };
  }

  const [registrations, totalCount, pendingCount, rejectedCount] = await Promise.all([
    prisma.registrations.findMany({
      where,
      include: {
        event: { select: { id: true, title: true, currency: true } },
        user: { select: { id: true, full_name: true, email: true } },
        pricing_option: { select: { id: true, label: true, price: true, currency: true } }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: skip
    }),
    prisma.registrations.count({ where }),
    prisma.registrations.count({ 
      where: { 
        status: 'PENDING_VERIFICATION', 
        payment_method: 'qfix' 
      } 
    }),
    prisma.registrations.count({ 
      where: { 
        status: 'REJECTED', 
        payment_method: 'qfix' 
      } 
    })
  ]);

  const serialized = registrations.map((r: any) => ({
    id: r.id,
    status: r.status,
    paid_amount: Number(r.paid_amount),
    currency: r.currency || 'USD',
    payment_proof_url: r.payment_proof_url,
    verification_status: r.verification_status,
    rejection_reason: r.rejection_reason,
    created_at: r.created_at?.toISOString(),
    event_title: r.event?.title || 'Unknown Event',
    event_id: r.event?.id,
    user_name: r.user?.full_name || 'Unknown User',
    user_email: r.user?.email || '',
    pricing_option_label: r.pricing_option?.label || null,
    pricing_option_price: r.pricing_option ? Number(r.pricing_option.price) : null,
  }));

  return (
    <PaymentVerificationClient 
      registrations={serialized} 
      role="admin" 
      totalCount={totalCount}
      currentPage={page}
      pendingCount={pendingCount}
      rejectedCount={rejectedCount}
    />
  );
}
