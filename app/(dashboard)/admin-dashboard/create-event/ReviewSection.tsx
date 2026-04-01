'use client';

import { useCreateEvent } from './CreateEventProvider';
import { format } from 'date-fns';
import { getCurrencySymbol } from '@/lib/currency';

export function ReviewSection({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const { state } = useCreateEvent();
  const isLight = variant === 'light';
  const { data } = state;

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Not set';
    return format(new Date(`2000-01-01T${timeString}`), 'h:mm a');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return format(new Date(dateString), 'PPP');
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className={isLight ? 'text-lg font-medium text-gray-900' : 'text-lg font-medium text-white'}>Event Details</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-slate-400">Title</h4>
            <p className={isLight ? 'text-gray-900' : 'text-white'}>{data.title || 'Not set'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-400">Location</h4>
            <p className={isLight ? 'text-gray-900' : 'text-white'}>{data.location || 'Not set'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-400">Date</h4>
            <p className={isLight ? 'text-gray-900' : 'text-white'}>{formatDate(data.event_date)}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-400">Time</h4>
            <p className={isLight ? 'text-gray-900' : 'text-white'}>
              {data.start_time ? formatTime(data.start_time) : 'Not set'}
              {data.end_time ? ` - ${formatTime(data.end_time)}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className={isLight ? 'text-lg font-medium text-gray-900' : 'text-lg font-medium text-white'}>Registration & Capacity</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-slate-400">Total Capacity</h4>
            <p className={isLight ? 'text-gray-900' : 'text-white'}>{data.total_capacity || 'Unlimited'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-400">Registration Status</h4>
            <p className={(isLight ? 'text-gray-900' : 'text-white') + ' capitalize'}>{data.registration_status || 'Not set'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-400">Auto-close when full</h4>
            <p className={isLight ? 'text-gray-900' : 'text-white'}>{data.auto_close_when_full ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className={isLight ? 'text-lg font-medium text-gray-900' : 'text-lg font-medium text-white'}>Pricing</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-slate-400">Event Type</h4>
            <p className={isLight ? 'text-gray-900' : 'text-white'}>{data.event_type || 'Not set'}</p>
          </div>
          {data.event_type === 'paid' && (
            <div>
              <h4 className="text-sm font-medium text-slate-400">Price</h4>
              <p className={isLight ? 'text-gray-900' : 'text-white'}>
                {getCurrencySymbol(data.currency)}{data.price?.toFixed(2)} {data.currency}
              </p>
            </div>
          )}
          {data.event_type === 'custom' && data.pricing_options && data.pricing_options.length > 0 && (
            <div className="col-span-full">
              <h4 className="text-sm font-medium text-slate-400 mb-2">Pricing Options</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.pricing_options.map((opt, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${isLight ? 'border-gray-200 bg-gray-50' : 'border-slate-700 bg-slate-800/50'}`}>
                    <div className="flex flex-col gap-1">
                      <span className={isLight ? 'text-gray-900 font-medium' : 'text-white font-medium'}>{opt.label}</span>
                      {data.use_dual_region_pricing ? (
                        <div className="flex flex-col gap-1 text-xs mt-1">
                          <span className="text-green-500 font-semibold">INR: ₹{opt.price_inr?.toFixed(2)}</span>
                          <span className="text-blue-500 font-semibold">USD: ${opt.price_usd?.toFixed(2)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <span className={isLight ? 'text-sky-600 font-bold' : 'text-sky-400 font-bold'}>
                            {getCurrencySymbol(opt.currency)}{opt.price.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className={isLight ? 'text-lg font-medium text-gray-900' : 'text-lg font-medium text-white'}>Visibility & Publishing</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-slate-400">Visibility</h4>
            <p className={isLight ? 'text-gray-900' : 'text-white'}>{data.visibility || 'Not set'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-400">Status</h4>
            <p className={isLight ? 'text-gray-900' : 'text-white'}>
              {data.save_mode === 'publish' ? 'Published (Approved)' : 'Draft'}
            </p>
          </div>
        </div>
      </div>

      {data.form_fields && data.form_fields.length > 0 && (
        <div className="space-y-4">
          <h3 className={isLight ? 'text-lg font-medium text-gray-900' : 'text-lg font-medium text-white'}>Registration Form Fields</h3>
          <div className="space-y-2">
            {data.form_fields.map((field, index) => (
              <div key={index} className={isLight ? 'rounded-md border border-gray-200 p-4' : 'rounded-md border border-slate-700 p-4'}>
                <div className="flex items-center justify-between">
                  <span className={isLight ? 'font-medium text-gray-900' : 'font-medium text-white'}>{field.label}</span>
                  <span className={isLight ? 'text-sm text-gray-600' : 'text-sm text-slate-400'}>
                    {field.field_type} • {field.required ? 'Required' : 'Optional'}
                  </span>
                </div>
                {field.options && field.options.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-slate-400">Options:</h4>
                    <p className={isLight ? 'text-sm text-gray-600' : 'text-sm text-slate-300'}>
                      {field.options.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
