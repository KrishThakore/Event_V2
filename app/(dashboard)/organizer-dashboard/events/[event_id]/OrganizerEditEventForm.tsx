'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EventBasicsSection } from '../../../admin-dashboard/create-event/EventBasicsSection';
import { CapacitySection } from '../../../admin-dashboard/create-event/CapacitySection';
import { PricingSection } from '../../../admin-dashboard/create-event/PricingSection';
import { FormBuilderSection } from '../../../admin-dashboard/create-event/FormBuilderSection';
import { VisibilitySection } from '../../../admin-dashboard/create-event/VisibilitySection';
import { ReviewSection } from '../../../admin-dashboard/create-event/ReviewSection';
import { CreateEventProvider, useCreateEvent, FormField, EventData } from '../../../admin-dashboard/create-event/CreateEventProvider';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  capacity: number;
  is_registration_open: boolean;
  price: number;
  image_url?: string;
  status: 'approved' | 'draft' | 'pending_approval' | 'cancelled';
  visibility?: 'public' | 'hidden';
  show_capacity?: boolean;
  is_unlimited?: boolean;
  assigned_organizer: string | null;
  created_at: string;
  form_fields?: FormField[];
  pricing_type?: 'free' | 'paid' | 'custom';
  pricing_dropdown_label?: string | null;
  pricing_options?: Array<{
    id: string;
    label: string;
    price: number;
  }>;
  currency?: string;
  qfix_link?: string | null;
  use_custom_qfix_link?: boolean;
}

function mapInitialData(event: Event): Partial<EventData> {
  return {
    title: event.title,
    description: event.description,
    location: event.location,
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: event.end_time,
    total_capacity: event.capacity,
    is_unlimited_capacity: event.is_unlimited ?? (event.capacity >= 999999),
    show_capacity: event.show_capacity ?? true,
    registration_status: event.is_registration_open ? 'open' : 'closed',
    auto_close_when_full: true,
    event_type: event.pricing_type || (event.price > 0 ? 'paid' : 'free'),
    price: event.price,
    form_fields: event.form_fields || [],
    visibility: (event.visibility ?? 'public') as any,
    save_mode: event.status === 'approved' ? 'publish' : 'draft',
    image_url: event.image_url || null,
    pricing_dropdown_label: event.pricing_dropdown_label || '',
    pricing_options: (event.pricing_options || []).map((opt: any) => ({
      ...opt,
      currency: opt.currency || event.currency || 'INR',
      price_inr: opt.price_inr ? Number(opt.price_inr) : (opt.currency === 'INR' ? Number(opt.price) : 0),
      price_usd: opt.price_usd ? Number(opt.price_usd) : (opt.currency === 'USD' ? Number(opt.price) : 0),
    })),
    qfix_link: event.qfix_link || '',
    use_custom_qfix_link: event.use_custom_qfix_link ?? false,
    use_dual_region_pricing: (event as any).use_dual_region_pricing ?? false,
    dual_region_label: (event as any).dual_region_label || 'Where are you from?',
    region_labels: Array.isArray((event as any).region_labels) ? (event as any).region_labels : [],
    currency: (event as any).use_dual_region_pricing ? 'DUAL' : (event.currency || 'INR'),
    price_inr: (event as any).price_inr || 0,
    price_usd: (event as any).price_usd || 0,
  };
}

function restrictClientFields(initialData: Event, current: EventData) {
  const status = initialData.status;
  const isApproved = status === 'approved';

  if (!isApproved) {
    return current;
  }

  return {
    ...current,
    total_capacity: initialData.capacity,
    event_date: initialData.event_date,
    start_time: initialData.start_time,
    end_time: initialData.end_time,
    event_type: initialData.price > 0 ? 'paid' : 'free',
    price: initialData.price,
    visibility: (initialData.visibility ?? 'public') as any
  };
}

function OrganizerEditEventFormContent({ initialData }: { initialData: Event }) {
  const { state, setSubmitting, toggleConfirmation, validateForm, updateField } = useCreateEvent();
  const router = useRouter();
  const [intent, setIntent] = useState<'save' | 'submit'>('save');

  const isApproved = initialData.status === 'approved';

  const openConfirm = (next: 'save' | 'submit') => {
    setIntent(next);
    toggleConfirmation();
  };

  const handleSubmit = async () => {
    const isValid = validateForm();
    if (!isValid) {
      toast.error('Please fix all errors before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const payload = restrictClientFields(initialData, state.data);

      const response = await fetch('/api/organizer/update-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: initialData.id,
          intent: intent === 'submit' ? 'submit_for_approval' : 'save',
          event: {
            title: payload.title,
            description: payload.description,
            location: payload.location,
            event_date: payload.event_date,
            start_time: payload.start_time,
            end_time: payload.end_time,
            capacity: payload.is_unlimited_capacity ? 999999 : payload.total_capacity,
            is_unlimited: payload.is_unlimited_capacity,
            show_capacity: payload.show_capacity,
            price: payload.event_type === 'paid' ? payload.price : 0,
            pricing_type: payload.event_type,
            pricing_dropdown_label: payload.event_type === 'custom' ? payload.pricing_dropdown_label : null,
            visibility: payload.visibility,
            image_url: payload.image_url,
            qfix_link: payload.qfix_link || null,
            use_custom_qfix_link: payload.use_custom_qfix_link || false,
            use_dual_region_pricing: payload.use_dual_region_pricing,
            dual_region_label: payload.dual_region_label,
            region_labels: payload.region_labels,
            currency: payload.currency === 'DUAL' ? 'INR' : (payload.currency || 'INR'),
            price_inr: payload.price_inr || null,
            price_usd: payload.price_usd || null,
          },
          pricing_options: payload.event_type === 'custom' ? payload.pricing_options : [],
          form_fields: payload.form_fields
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || 'Failed to update event');
        return;
      }

      toast.success(intent === 'submit' ? 'Event submitted for approval' : 'Event updated successfully');
      router.push(`/organizer-dashboard/events?updated_event=${encodeURIComponent(initialData.id)}`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  const statusHelper = isApproved
    ? 'Approved event: you can only edit description, location, and registration form fields.'
    : 'Draft/Pending: you can edit all event details. You can submit for approval when ready.';

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600">
        <p className="font-semibold text-gray-900">Status: {initialData.status}</p>
        <p className="mt-1 text-[11px] text-gray-600">{statusHelper}</p>
      </div>

      <Card variant="light">
        <CardHeader>
          <CardTitle>Event Basics</CardTitle>
          <CardDescription>Basic information about your event</CardDescription>
        </CardHeader>
        <CardContent>
          <EventBasicsSection variant="light" />
        </CardContent>
      </Card>

      <Card variant="light">
        <CardHeader>
          <CardTitle>Capacity & Registration</CardTitle>
          <CardDescription>Set capacity and registration options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={isApproved ? 'pointer-events-none opacity-60' : ''}>
            <CapacitySection variant="light" />
          </div>
        </CardContent>
      </Card>

      <Card variant="light">
        <CardHeader>
          <CardTitle>Pricing & Payment</CardTitle>
          <CardDescription>Configure pricing and payment options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={isApproved ? 'pointer-events-none opacity-60' : ''}>
            <PricingSection variant="light" />
          </div>
        </CardContent>
      </Card>

      <Card variant="light">
        <CardHeader>
          <CardTitle>Registration Form Builder</CardTitle>
          <CardDescription>Customize the registration form</CardDescription>
        </CardHeader>
        <CardContent>
          <FormBuilderSection variant="light" />
        </CardContent>
      </Card>

      <Card variant="light">
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
          <CardDescription>Control event visibility in public listings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={isApproved ? 'pointer-events-none opacity-60' : ''}>
            <VisibilitySection variant="light" />
          </div>
        </CardContent>
      </Card>

      <Card variant="light">
        <CardHeader>
          <CardTitle>Review</CardTitle>
          <CardDescription>Review your changes before saving</CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewSection variant="light" />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => openConfirm('save')} disabled={state.isSubmitting}>
          Save Changes
        </Button>
        {!isApproved && (
          <Button onClick={() => openConfirm('submit')} disabled={state.isSubmitting}>
            Submit for Approval
          </Button>
        )}
      </div>

      {state.showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card variant="light" className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirm</CardTitle>
              <CardDescription>
                {intent === 'submit'
                  ? 'This event will be submitted for admin approval. Continue?'
                  : 'Save these changes now?'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end space-x-4">
              <Button variant="outline" onClick={toggleConfirmation} disabled={state.isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  toggleConfirmation();
                  handleSubmit();
                }}
                disabled={state.isSubmitting}
              >
                {state.isSubmitting ? 'Saving...' : 'Confirm'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function OrganizerEditEventForm({ initialData }: { initialData: Event }) {
  return (
    <CreateEventProvider initialData={mapInitialData(initialData)}>
      <OrganizerEditEventFormContent initialData={initialData} />
    </CreateEventProvider>
  );
}
