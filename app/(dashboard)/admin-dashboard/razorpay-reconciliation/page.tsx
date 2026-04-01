import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ReconciliationClient from './ReconciliationClient';

export const revalidate = 0;

export default async function RazorpayReconciliationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  return (
    <div className="container mx-auto py-8">
      <ReconciliationClient />
    </div>
  );
}
