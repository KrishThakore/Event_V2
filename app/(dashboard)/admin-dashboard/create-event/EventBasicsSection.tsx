'use client';

import { useCreateEvent } from './CreateEventProvider';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { AdvancedRichTextEditor } from '@/components/AdvancedRichTextEditor';
import { parseEventImages } from '@/lib/utils';
import { getISTDateYYYYMMDD } from '@/lib/date';

export function EventBasicsSection({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const { state, updateField, setError, clearError } = useCreateEvent();

  const isLight = variant === 'light';
  const headerBorder = isLight ? 'border-b border-gray-200 pb-2' : 'border-b border-slate-700 pb-2';
  const headerTitle = isLight ? 'text-lg font-semibold text-gray-900' : 'text-lg font-semibold text-white';
  const headerDesc = isLight ? 'text-sm text-gray-600' : 'text-sm text-slate-400';
  const labelClass = isLight ? 'block text-sm font-medium text-gray-700 mb-1' : 'block text-sm font-medium text-slate-300 mb-1';
  const inputBase = isLight
    ? 'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500'
    : 'w-full rounded-lg border bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500';

  const { coverUrl, bgUrl } = parseEventImages(state.data.image_url);

  const handleImageChange = (type: 'cover' | 'bg', url: string | null) => {
    const newCover = type === 'cover' ? url || '' : coverUrl;
    const newBg = type === 'bg' ? url || '' : bgUrl;
    
    // Save as JSON string containing both images
    const combinedUrl = JSON.stringify({ coverUrl: newCover, bgUrl: newBg });
    updateField('image_url', combinedUrl);
    
    // Validate if at least the cover is missing
    if (!newCover) {
      setError('image_url', 'Event card image is required');
    } else {
      clearError('image_url');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    updateField(field as any, value);
    
    // Basic validation
    if (field === 'title' && !value.trim()) {
      setError('title', 'Event title is required');
    } else if (field === 'title') {
      clearError('title');
    }
    
    if (field === 'description' && !value.trim()) {
      setError('description', 'Event description is required');
    } else if (field === 'description') {
      clearError('description');
    }
    
    if (field === 'location' && !value.trim()) {
      setError('location', 'Location is required');
    } else if (field === 'location') {
      clearError('location');
    }
  };

  const handleDateChange = (value: string) => {
    updateField('event_date', value);
    
    if (!value) {
      setError('event_date', 'Event date is required');
    } else {
      const eventDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (eventDate < today) {
        setError('event_date', 'Event date must be today or in the future');
      } else {
        clearError('event_date');
      }
    }
  };

  const handleTimeChange = (field: 'start_time' | 'end_time', value: string) => {
    updateField(field, value);
    
    if (!value) {
      setError(field, `${field === 'start_time' ? 'Start' : 'End'} time is required`);
    } else {
      clearError(field);
      
      // Validate end time is after start time
      if (field === 'end_time' && state.data.start_time) {
        const start = new Date(`2000-01-01T${state.data.start_time}`);
        const end = new Date(`2000-01-01T${value}`);
        if (end <= start) {
          setError('end_time', 'End time must be after start time');
        } else {
          clearError('end_time');
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className={headerBorder}>
        <h2 className={headerTitle}>Event Basics</h2>
        <p className={headerDesc}>Required information about your event</p>
      </div>

      <div className="grid gap-4">
        {/* Event Images (Dual Upload) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Event Card Cover Image <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">This image will be shown on the event listing cards.</p>
            <ImageUpload
              value={coverUrl || undefined}
              onChange={(url) => handleImageChange('cover', url)}
              required={true}
              variant={variant}
              category="event-covers"
            />
            {state.errors.image_url && !coverUrl && (
              <p className="mt-1 text-sm text-red-400">{state.errors.image_url}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              Event Page Background Image
            </label>
            <p className="text-xs text-gray-500 mb-2">Optional immersive background image for the event details page.</p>
            <ImageUpload
              value={bgUrl || undefined}
              onChange={(url) => handleImageChange('bg', url)}
              required={false}
              variant={variant}
              category="event-backgrounds"
            />
          </div>
        </div>

        {/* Event Title */}
        <div>
          <label htmlFor="title" className={labelClass}>
            Event Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={state.data.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`${inputBase} ${state.errors.title ? 'border-red-500' : (isLight ? 'border-gray-300' : 'border-slate-600')}`}
            placeholder="Enter event title"
          />
          {state.errors.title && (
            <p className="mt-1 text-sm text-red-400">{state.errors.title}</p>
          )}
        </div>

        {/* Event Description */}
        <div>
          <label htmlFor="description" className={labelClass}>
            Event Description <span className="text-red-400">*</span>
          </label>
          <AdvancedRichTextEditor
            value={state.data.description || ''}
            onChange={(value: string) => handleInputChange('description', value)}
            variant={variant}
            placeholder="Describe your event in detail"
            error={state.errors.description}
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className={labelClass}>
            Location <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="location"
            value={state.data.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            className={`${inputBase} ${state.errors.location ? 'border-red-500' : (isLight ? 'border-gray-300' : 'border-slate-600')}`}
            placeholder="Event location or venue"
          />
          {state.errors.location && (
            <p className="mt-1 text-sm text-red-400">{state.errors.location}</p>
          )}
        </div>

        {/* Event Date */}
        <div>
          <label htmlFor="event_date" className={labelClass}>
            Event Date <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            id="event_date"
            value={state.data.event_date}
            onChange={(e) => handleDateChange(e.target.value)}
            min={getISTDateYYYYMMDD()}
            className={`${inputBase} ${state.errors.event_date ? 'border-red-500' : (isLight ? 'border-gray-300' : 'border-slate-600')}`}
          />
          {state.errors.event_date && (
            <p className="mt-1 text-sm text-red-400">{state.errors.event_date}</p>
          )}
        </div>

        {/* Start and End Times */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_time" className={labelClass}>
              Start Time <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              id="start_time"
              value={state.data.start_time}
              onChange={(e) => handleTimeChange('start_time', e.target.value)}
              className={`${inputBase} ${state.errors.start_time ? 'border-red-500' : (isLight ? 'border-gray-300' : 'border-slate-600')}`}
            />
            {state.errors.start_time && (
              <p className="mt-1 text-sm text-red-400">{state.errors.start_time}</p>
            )}
          </div>

          <div>
            <label htmlFor="end_time" className={labelClass}>
              End Time <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              id="end_time"
              value={state.data.end_time}
              onChange={(e) => handleTimeChange('end_time', e.target.value)}
              className={`${inputBase} ${state.errors.end_time ? 'border-red-500' : (isLight ? 'border-gray-300' : 'border-slate-600')}`}
            />
            {state.errors.end_time && (
              <p className="mt-1 text-sm text-red-400">{state.errors.end_time}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
