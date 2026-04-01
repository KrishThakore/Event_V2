'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EventBasicsSection } from './EventBasicsSection';
import { CapacitySection } from './CapacitySection';
import { PricingSection } from './PricingSection';
import { FormBuilderSection } from './FormBuilderSection';
import { VisibilitySection } from './VisibilitySection';
import { OrganizerSection } from './OrganizerSection';
import { ReviewSection } from './ReviewSection';
import { CreateEventProvider, useCreateEvent } from './CreateEventProvider';

function CreateEventFormContent({ organizers }: { organizers: any[] }) {
  const { state, setSubmitting, toggleConfirmation, validateForm } = useCreateEvent();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix all errors before submitting');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Creating event...');
    try {
      const response = await fetch('/api/admin/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: {
            title: state.data.title,
            description: state.data.description,
            location: state.data.location,
            event_date: state.data.event_date,
            start_time: state.data.start_time,
            end_time: state.data.end_time,
            image_url: state.data.image_url,
            capacity: state.data.is_unlimited_capacity ? 999999 : state.data.total_capacity,
            is_unlimited_capacity: state.data.is_unlimited_capacity,
            show_capacity: state.data.show_capacity,
            is_registration_open: state.data.registration_status === 'open',
            price: state.data.event_type === 'paid' ? state.data.price : 0,
            pricing_type: state.data.event_type,
            pricing_dropdown_label: state.data.event_type === 'custom' ? state.data.pricing_dropdown_label : null,
            status: state.data.save_mode === 'publish' ? 'approved' : 'draft',
            visibility: state.data.visibility,
            assigned_organizer: state.data.assigned_organizer || null,
            currency: state.data.currency === 'DUAL' ? 'INR' : (state.data.currency || 'INR'),
            use_dual_region_pricing: state.data.use_dual_region_pricing || state.data.currency === 'DUAL',
            dual_region_label: state.data.dual_region_label,
            region_labels: state.data.region_labels,
            price_inr: state.data.price_inr || null,
            price_usd: state.data.price_usd || null,
            qfix_link: state.data.qfix_link || null,
            use_custom_qfix_link: state.data.use_custom_qfix_link || false,
          },
          pricing_options: state.data.event_type === 'custom' ? state.data.pricing_options : [],
          form_fields: state.data.form_fields,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const message = result.error || 'Failed to create event. Please try again.';
        toast.error(message, { id: toastId });
        return;
      }

      toast.success('Event created successfully', { id: toastId });
      const eventId = result.event?.id as string | undefined;
      if (eventId) {
        router.push(`/admin-dashboard/events?new_event=${encodeURIComponent(eventId)}`);
      } else {
        router.push('/admin-dashboard/events');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event. Please try again.', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Event Basics */}
      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Event Basics</CardTitle>
          <CardDescription className="text-gray-500">Basic information about your event</CardDescription>
        </CardHeader>
        <CardContent>
          <EventBasicsSection variant="light" />
        </CardContent>
      </Card>

      {/* Section 2: Capacity & Registration */}
      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Capacity & Registration</CardTitle>
          <CardDescription className="text-gray-500">Set capacity and registration options</CardDescription>
        </CardHeader>
        <CardContent>
          <CapacitySection variant="light" />
        </CardContent>
      </Card>

      {/* Section 3: Pricing & Payment */}
      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Pricing & Payment</CardTitle>
          <CardDescription className="text-gray-500">Configure pricing and payment options</CardDescription>
        </CardHeader>
        <CardContent>
          <PricingSection variant="light" />
        </CardContent>
      </Card>

      {/* Section 4: Registration Form Builder */}
      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Registration Form Builder</CardTitle>
          <CardDescription className="text-gray-500">Customize registration form</CardDescription>
        </CardHeader>
        <CardContent>
          <FormBuilderSection variant="light" />
        </CardContent>
      </Card>

      {/* Section 5: Visibility & Publishing */}
      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Visibility & Publishing</CardTitle>
          <CardDescription className="text-gray-500">Control event visibility and publishing</CardDescription>
        </CardHeader>
        <CardContent>
          <VisibilitySection variant="light" />
        </CardContent>
      </Card>

      {/* Section 6: Organizer Assignment */}
      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Organizer Assignment</CardTitle>
          <CardDescription className="text-gray-500">Assign an organizer (optional)</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizerSection organizers={organizers} />
        </CardContent>
      </Card>

      {/* Section 7: Review & Confirmation */}
      <Card variant="light" className="border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black">Review</CardTitle>
          <CardDescription className="text-gray-500">Review your event details before saving</CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewSection variant="light" />
        </CardContent>
      </Card>

      {/* Primary submit action */}
      <div className="flex justify-end">
        <Button onClick={toggleConfirmation} disabled={state.isSubmitting}>
          {state.isSubmitting ? 'Creating Event...' : 'Create Event'}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      {state.showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card variant="light" className="w-full max-w-md border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-black">Confirm</CardTitle>
              <CardDescription className="text-gray-500">
                This event will be created as {state.data.save_mode === 'publish' ? 'APPROVED' : 'DRAFT'} and may be visible immediately. Continue?
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end space-x-4">
              <Button 
                variant="outline" 
                onClick={toggleConfirmation} 
                disabled={state.isSubmitting}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  toggleConfirmation();
                  handleSubmit();
                }} 
                disabled={state.isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {state.isSubmitting ? 'Creating...' : 'Confirm & Create'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export function CreateEventForm({ organizers }: { organizers: any[] }) {
  return (
    <CreateEventProvider>
      <CreateEventFormContent organizers={organizers} />
    </CreateEventProvider>
  );
}
