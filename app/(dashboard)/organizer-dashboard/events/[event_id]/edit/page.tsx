import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import OrganizerEditEventForm from '../OrganizerEditEventForm';
import { serializePrisma } from '@/lib/serialize';

export const revalidate = 0;

export default async function OrganizerEditEventPage({ params }: { params: { event_id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'organizer') redirect('/organizer');

  const userId = session.user.id;

  const event = await prisma.events.findUnique({
    where: { id: params.event_id },
    select: { 
      id: true, 
      title: true, 
      description: true, 
      location: true, 
      event_date: true, 
      start_time: true, 
      end_time: true, 
      capacity: true, 
      is_registration_open: true, 
      price: true, 
      pricing_type: true,
      pricing_dropdown_label: true,
      pricing_tiers: true,
      show_capacity: true,
      is_unlimited: true,
      status: true, 
      assigned_organizer: true, 
      created_by: true, 
      created_at: true, 
      image_url: true,
      currency: true,
      qfix_link: true,
      use_custom_qfix_link: true
    }
  });

  if (!event) {
    return (
      <div className="container mx-auto py-8">
        <Card><CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Error</h2>
            <p className="text-gray-600 mb-4">Event not found</p>
            <Link href="/organizer-dashboard/events"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back to Events</Button></Link>
          </div>
        </CardContent></Card>
      </div>
    );
  }

  // Ownership check: organizer must be the creator or assigned organizer
  const isOwned = (event.created_by === userId || event.assigned_organizer === userId);
  if (!isOwned) redirect('/');

  const formFields = await prisma.event_form_fields.findMany({
    where: { event_id: event.id },
    select: { id: true, label: true, field_type: true, required: true, options: true, disabled: true, original_required: true, condition: true },
    orderBy: { created_at: 'asc' }
  });

  const initialData = serializePrisma({ ...event, form_fields: formFields }) as any;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/organizer-dashboard/events"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back to Events</Button></Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Event</h1>
          <p className="text-gray-600">Update details based on approval status</p>
        </div>
      </div>
      <OrganizerEditEventForm initialData={initialData} />
    </div>
  );
}
