import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import OrganizerCreateEventForm from './OrganizerCreateEventForm';

export const revalidate = 0;

export default async function OrganizerCreateEventPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'organizer') redirect('/organizer');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>
          <p className="mt-1 text-sm text-gray-500">Create your event as a draft, then submit it for approval</p>
        </div>
      </div>
      <OrganizerCreateEventForm />
    </div>
  );
}
