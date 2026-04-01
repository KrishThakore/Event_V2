import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import RazorpayLookupClient from './RazorpayLookupClient';

export const revalidate = 0;

interface SearchParams {
  query?: string;
  scanLimit?: string;
}

export default async function RazorpayLookupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const initialQuery = searchParams?.query ?? '';
  const initialScanLimit = Number(searchParams?.scanLimit ?? '1000') || 1000;

  return (
    <div className="container mx-auto py-8">
      <RazorpayLookupClient
        initialQuery={initialQuery}
        initialScanLimit={initialScanLimit}
      />
    </div>
  );
}
