import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EditEventForm from '../EditEventForm';
import { serializePrisma } from '@/lib/serialize';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function EditEventPage({ params }: { params: { event_id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const eventId = params.event_id;

  const [event, formFields, organizers] = await Promise.all([
    prisma.events.findUnique({
      where: { id: eventId },
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
        use_custom_qfix_link: true,
        use_dual_region_pricing: true,
        dual_region_label: true,
        region_labels: true,
        price_inr: true,
        price_usd: true,
        pricing_options: {
          select: { id: true, label: true, price: true, currency: true, price_inr: true, price_usd: true } as any,
          orderBy: { created_at: 'asc' }
        }
      } as any
    }),
    prisma.event_form_fields.findMany({
      where: { event_id: eventId },
      select: { id: true, label: true, field_type: true, required: true, options: true, disabled: true, original_required: true, condition: true },
      orderBy: { created_at: 'asc' }
    }),
    prisma.profiles.findMany({
      where: { role: 'organizer' },
      select: { id: true, full_name: true, email: true },
      orderBy: { full_name: 'asc' }
    })
  ]);

  if (!event) {
    return (
      <div className="container mx-auto py-8">
        <Card><CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">Event Not Found</h2>
            <Link href="/admin-dashboard/events"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back to Events</Button></Link>
          </div>
        </CardContent></Card>
      </div>
    );
  }

  const initialData = serializePrisma({ ...event, form_fields: formFields, visibility: 'public' }) as any;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin-dashboard/events">
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back to Events</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Event</h1>
          <p className="text-gray-600">Update details based on approval status</p>
        </div>
      </div>
      <EditEventForm initialData={initialData} organizers={organizers} />
    </div>
  );
}
