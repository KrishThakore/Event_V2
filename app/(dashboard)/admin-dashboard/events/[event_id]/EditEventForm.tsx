'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EventBasicsSection } from '../../create-event/EventBasicsSection';
import { CapacitySection } from '../../create-event/CapacitySection';
import { PricingSection } from '../../create-event/PricingSection';
import { FormBuilderSection } from '../../create-event/FormBuilderSection';
import { VisibilitySection } from '../../create-event/VisibilitySection';
import { OrganizerSection } from '../../create-event/OrganizerSection';
import { CreateEventProvider, useCreateEvent, FormField, EventData } from '../../create-event/CreateEventProvider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, X, ArrowRight, Calendar } from 'lucide-react';
import { updateEventAction } from './edit/actions';
import { formatDateForInput, formatTimeForInput } from '@/lib/date';
import { parseEventImages } from '@/lib/utils';

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
  status: 'approved' | 'draft' | 'cancelled';
  visibility?: 'public' | 'hidden';
  show_capacity?: boolean;
  is_unlimited?: boolean;
  registration_deadline?: string;
  assigned_organizer: string | null;
  created_at: string;
  updated_at?: string;
  form_fields?: FormField[];
  pricing_type?: 'free' | 'paid' | 'custom';
  pricing_dropdown_label?: string | null;
  pricing_options?: Array<{
    id: string;
    label: string;
    price: number;
    currency?: string;
    price_inr?: number;
    price_usd?: number;
  }>;
  currency?: string;
  use_dual_region_pricing?: boolean;
  dual_region_label?: string;
  region_labels?: any;
  price_inr?: number;
  price_usd?: number;
  qfix_link?: string | null;
  use_custom_qfix_link?: boolean;
}

type Organizer = {
  id: string;
  full_name: string;
  email: string | null;
};

interface EditEventFormProps {
  initialData: Event;
  organizers: Organizer[];
}

function EditEventFormContent({ initialData, organizers }: EditEventFormProps) {
  const { state, setSubmitting, toggleConfirmation, validateForm } = useCreateEvent();
  const router = useRouter();
  const logPrefix = '[EDIT_EVENT:client]';

  // Map initial event data to form data structure
  const mapInitialData = (event: Event): Partial<EventData> => ({
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
    auto_close_when_full: true, // Default
    event_type: event.pricing_type || (event.price > 0 ? 'paid' : 'free'),
    price: event.price,
    currency: event.currency || 'INR',
    form_fields: event.form_fields || [],
    visibility: event.visibility ?? 'public',
    save_mode: event.status === 'approved' ? 'publish' : 'draft',
    assigned_organizer: event.assigned_organizer,
    image_url: event.image_url || null,
    pricing_dropdown_label: event.pricing_dropdown_label || undefined,
    pricing_options: (event.pricing_options || []).map(opt => ({
      ...opt,
      currency: opt.currency || event.currency || 'INR',
      price_inr: opt.price_inr || (opt.currency === 'INR' ? opt.price : 0),
      price_usd: opt.price_usd || (opt.currency === 'USD' ? opt.price : 0)
    })),
    use_dual_region_pricing: event.use_dual_region_pricing ?? false,
    dual_region_label: event.dual_region_label || 'Where are you from?',
    region_labels: Array.isArray(event.region_labels) ? event.region_labels : [],
    price_inr: event.price_inr || 0,
    price_usd: event.price_usd || 0,
    qfix_link: event.qfix_link || '',
    use_custom_qfix_link: event.use_custom_qfix_link ?? false,
  });

  const handleSubmit = async () => {
    console.log(logPrefix, 'submit.clicked', { eventId: initialData.id });

    const isValid = validateForm();
    console.log(logPrefix, 'validateForm', {
      isValid,
      errorsCount: Object.keys(state.errors ?? {}).length
    });

    if (!isValid) {
      toast.error('Please fix all errors before submitting');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Updating event...');
    try {
      console.log(logPrefix, 'submit.payload', {
        eventId: initialData.id,
        titleLen: (state.data.title ?? '').length,
        event_date: state.data.event_date,
        start_time: state.data.start_time,
        end_time: state.data.end_time,
        capacity: state.data.total_capacity,
        status: state.data.save_mode,
        visibility: state.data.visibility,
        assigned_organizer: state.data.assigned_organizer ?? null,
        formFieldsCount: (state.data.form_fields ?? []).length
      });

      const result = await updateEventAction({
        eventId: initialData.id,
        event: {
          title: state.data.title,
          description: state.data.description,
          location: state.data.location,
          event_date: state.data.event_date,
          start_time: state.data.start_time,
          end_time: state.data.end_time,
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
          image_url: state.data.image_url,
          currency: state.data.currency || 'INR',
          qfix_link: state.data.qfix_link || null,
          use_custom_qfix_link: state.data.use_custom_qfix_link || false,
          use_dual_region_pricing: state.data.use_dual_region_pricing,
          dual_region_label: state.data.dual_region_label,
          region_labels: state.data.region_labels,
          price_inr: state.data.price_inr || null,
          price_usd: state.data.price_usd || null,
        },
        pricing_options: state.data.event_type === 'custom' ? state.data.pricing_options : [],
        form_fields: state.data.form_fields,
      });

      console.log(logPrefix, 'submit.result', result);

      if (!result.success) {
        const message = (result as any).error || 'Failed to update event. Please try again.';
        toast.error(message, { id: toastId });
        return;
      }

      toast.success('Event updated successfully', { id: toastId });
      router.push(`/admin-dashboard/events?updated_event=${encodeURIComponent(initialData.id)}`);
    } catch (error) {
      console.error('Error updating event:', error);
      console.log(logPrefix, 'submit.exception', {
        message: (error as any)?.message ?? String(error)
      });
      toast.error('Failed to update event. Please try again.', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate differences for review modal
  const getDifferences = () => {
    const original = mapInitialData(initialData);
    const current = state.data;
    const differences: Array<{ field: string; label: string; original: any; current: any; type: 'text' | 'boolean' | 'number' }> = [];

    const fields: Array<{ key: keyof EventData; label: string; type: 'text' | 'boolean' | 'number' }> = [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'event_date', label: 'Event Date', type: 'text' },
      { key: 'start_time', label: 'Start Time', type: 'text' },
      { key: 'end_time', label: 'End Time', type: 'text' },
      { key: 'total_capacity', label: 'Capacity', type: 'number' },
      { key: 'registration_status', label: 'Registration Status', type: 'text' },
      { key: 'event_type', label: 'Event Type', type: 'text' },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'visibility', label: 'Visibility', type: 'text' },
      { key: 'save_mode', label: 'Save Mode', type: 'text' },
      { key: 'form_fields', label: 'Form Fields', type: 'text' },
      { key: 'image_url', label: 'Event Image', type: 'text' },
    ];

    fields.forEach(({ key, label, type }) => {
      const originalValue = original[key];
      const currentValue = current[key];
      
      if (JSON.stringify(originalValue) !== JSON.stringify(currentValue)) {
        differences.push({
          field: key,
          label,
          original: originalValue,
          current: currentValue,
          type
        });
      }
    });

    return differences;
  };

  const differences = getDifferences();
  const hasChanges = differences.length > 0;

  return (
    <div className="space-y-6">
      {/* Event Image Display */}
      <div className="mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            {initialData.image_url ? (() => {
              const { coverUrl, bgUrl } = parseEventImages(initialData.image_url);
              return (
                <div className="flex gap-6">
                  {coverUrl && (
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden border border-gray-100 shadow-sm relative">
                          <img 
                            src={coverUrl} 
                            alt="Cover Image"
                            className="w-full h-full object-cover"
                            onLoad={() => console.log('✅ Admin Edit: Event cover loaded')}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 items-center justify-center hidden">
                            <Calendar className="w-8 h-8 text-purple-400" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Cover Image</h3>
                        <p className="text-xs text-gray-500">Used on event cards</p>
                      </div>
                    </div>
                  )}

                  {bgUrl && (
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-48 h-24 bg-gray-200 rounded-lg overflow-hidden border border-gray-100 shadow-sm relative">
                          <img 
                            src={bgUrl} 
                            alt="Background Image"
                            className="w-full h-full object-cover"
                            onLoad={() => console.log('✅ Admin Edit: Event bg loaded')}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 items-center justify-center hidden">
                            <Calendar className="w-8 h-8 text-purple-400" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Background Image</h3>
                        <p className="text-xs text-gray-500">Used on event details page</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-purple-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Current Event Images</h3>
                  <p className="text-xs text-gray-500">No images uploaded yet</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Helper Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600">
        <p className="font-semibold text-gray-900">Status: {initialData.status}</p>
        <p className="mt-1 text-[11px] text-gray-600">
          {initialData.status === 'approved' 
            ? 'Approved event: you can edit all event details.' 
            : 'Draft/Pending: you can edit all event details. You can publish when ready.'}
        </p>
      </div>

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
          <CardTitle className="text-lg font-semibold text-black">Visibility</CardTitle>
          <CardDescription className="text-gray-500">Control event visibility in public listings</CardDescription>
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

      {/* Primary submit action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={toggleConfirmation} disabled={state.isSubmitting || !hasChanges}>
          Save Changes
        </Button>
        <Button 
          onClick={toggleConfirmation} 
          disabled={state.isSubmitting || !hasChanges}
          className="bg-purple-600 hover:bg-purple-700 text-white min-w-[140px]"
        >
          {state.isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Updating...</span>
            </div>
          ) : hasChanges ? (
            'Update Event'
          ) : (
            'No Changes'
          )}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      {state.showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card variant="light" className="w-full max-w-md border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-black">Confirm</CardTitle>
              <CardDescription className="text-gray-500">
                Save these changes now?
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
                disabled={state.isSubmitting || !hasChanges}
                className="bg-purple-600 hover:bg-purple-700 text-white"
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

export default function EditEventForm({ initialData, organizers }: EditEventFormProps) {
  const mappedInitialData = {
    title: initialData.title,
    description: initialData.description,
    location: initialData.location,
    event_date: formatDateForInput(initialData.event_date),
    start_time: formatTimeForInput(initialData.start_time),
    end_time: formatTimeForInput(initialData.end_time),
    total_capacity: initialData.capacity,
    is_unlimited_capacity: initialData.is_unlimited ?? (initialData.capacity >= 999999),
    show_capacity: initialData.show_capacity ?? true,
    registration_status: initialData.is_registration_open ? ('open' as const) : ('closed' as const),
    auto_close_when_full: true,
    event_type: (initialData.pricing_type as 'free' | 'paid' | 'custom') || (initialData.price > 0 ? 'paid' : 'free'),
    price: initialData.price,
    form_fields: initialData.form_fields || [],
    visibility: initialData.visibility ?? 'public',
    pricing_dropdown_label: initialData.pricing_dropdown_label || '',
    pricing_options: initialData.pricing_options?.map((opt: any) => ({
      id: opt.id,
      label: opt.label,
      price: Number(opt.price),
      currency: opt.currency || initialData.currency || 'INR',
      price_inr: opt.price_inr ? Number(opt.price_inr) : 0,
      price_usd: opt.price_usd ? Number(opt.price_usd) : 0,
    })) || [],
    save_mode: initialData.status === 'approved' ? 'publish' as const : 'draft' as const,
    assigned_organizer: initialData.assigned_organizer ?? null,
    image_url: initialData.image_url || null,
    qfix_link: initialData.qfix_link || '',
    use_custom_qfix_link: initialData.use_custom_qfix_link ?? false,
    use_dual_region_pricing: initialData.use_dual_region_pricing ?? false,
    dual_region_label: initialData.dual_region_label || 'Where are you from?',
    region_labels: Array.isArray(initialData.region_labels) ? initialData.region_labels : [],
    currency: initialData.use_dual_region_pricing ? 'DUAL' : (initialData.currency || 'INR'),
    price_inr: initialData.price_inr || 0,
    price_usd: initialData.price_usd || 0,
  };

  return (
    <CreateEventProvider initialData={mappedInitialData}>
      <EditEventFormContent initialData={initialData} organizers={organizers} />
    </CreateEventProvider>
  );
}
