'use client';

import { useCreateEvent } from './CreateEventProvider';

export function CapacitySection({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const { state, updateField, setError, clearError } = useCreateEvent();

  const isLight = variant === 'light';
  const headerBorder = isLight ? 'border-b border-gray-200 pb-2' : 'border-b border-slate-700 pb-2';
  const headerTitle = isLight ? 'text-lg font-semibold text-gray-900' : 'text-lg font-semibold text-white';
  const headerDesc = isLight ? 'text-sm text-gray-600' : 'text-sm text-slate-400';
  const labelClass = isLight ? 'block text-sm font-medium text-gray-700 mb-1' : 'block text-sm font-medium text-slate-300 mb-1';
  const inputBase = isLight
    ? 'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500'
    : 'w-full rounded-lg border bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500';

  const handleCapacityChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    updateField('total_capacity', numValue);
    
    if (numValue <= 0) {
      setError('total_capacity', 'Capacity must be greater than 0');
    } else {
      clearError('total_capacity');
    }
  };

  const handleUnlimitedToggle = (checked: boolean) => {
    updateField('is_unlimited_capacity', checked);
    if (checked) {
      clearError('total_capacity');
    }
  };

  return (
    <div className="space-y-4">
      <div className={headerBorder}>
        <h2 className={headerTitle}>Capacity & Registration Control</h2>
        <p className={headerDesc}>Set event capacity and registration settings</p>
      </div>

      <div className="grid gap-4">
        {/* Unlimited Capacity Toggle */}
        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={state.data.is_unlimited_capacity}
              onChange={(e) => handleUnlimitedToggle(e.target.checked)}
              className={`w-4 h-4 text-sky-500 rounded ${isLight ? 'bg-white border-gray-300' : 'bg-slate-800 border-slate-600'} focus:ring-sky-500 focus:ring-2`}
            />
            <div className="flex-1">
              <span className={`text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>Unlimited Capacity</span>
              <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>
                Allow unlimited registrations without a cap
              </p>
            </div>
          </label>
        </div>

        {/* Total Capacity (only shown when not unlimited) */}
        {!state.data.is_unlimited_capacity && (
          <div>
            <label htmlFor="total_capacity" className={labelClass}>
              Total Capacity <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              id="total_capacity"
              value={state.data.total_capacity}
              onChange={(e) => handleCapacityChange(e.target.value)}
              min="1"
              className={`${inputBase} ${state.errors.total_capacity ? 'border-red-500' : (isLight ? 'border-gray-300' : 'border-slate-600')}`}
              placeholder="Maximum number of attendees"
            />
            {state.errors.total_capacity && (
              <p className="mt-1 text-sm text-red-400">{state.errors.total_capacity}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Maximum number of people who can register for this event</p>
          </div>
        )}

        {/* Show Capacity Toggle */}
        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={state.data.show_capacity}
              onChange={(e) => updateField('show_capacity', e.target.checked)}
              className={`w-4 h-4 text-sky-500 rounded ${isLight ? 'bg-white border-gray-300' : 'bg-slate-800 border-slate-600'} focus:ring-sky-500 focus:ring-2`}
            />
            <div className="flex-1">
              <span className={`text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>Display capacity on public page</span>
              <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>
                {state.data.is_unlimited_capacity
                  ? 'Show "Unlimited Spots" to attendees'
                  : 'Show remaining spots and total capacity to attendees'}
              </p>
            </div>
          </label>
        </div>

        {/* Registration Status */}
        <div>
          <label className={labelClass}>
            Registration Status
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="registration_status"
                value="open"
                checked={state.data.registration_status === 'open'}
                onChange={() => updateField('registration_status', 'open')}
                className={`w-4 h-4 text-sky-500 ${isLight ? 'bg-white border-gray-300' : 'bg-slate-800 border-slate-600'} focus:ring-sky-500 focus:ring-2`}
              />
              <div className="flex-1">
                <span className={`text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>Open</span>
                <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>Users can register immediately</p>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="registration_status"
                value="closed"
                checked={state.data.registration_status === 'closed'}
                onChange={() => updateField('registration_status', 'closed')}
                className={`w-4 h-4 text-sky-500 ${isLight ? 'bg-white border-gray-300' : 'bg-slate-800 border-slate-600'} focus:ring-sky-500 focus:ring-2`}
              />
              <div className="flex-1">
                <span className={`text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>Closed</span>
                <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>Registration is not available</p>
              </div>
            </label>
          </div>
        </div>

        {/* Auto-close Registration (only when not unlimited) */}
        {!state.data.is_unlimited_capacity && (
          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                id="auto_close_when_full"
                checked={state.data.auto_close_when_full}
                onChange={(e) => updateField('auto_close_when_full', e.target.checked)}
                className={`w-4 h-4 text-sky-500 rounded ${isLight ? 'bg-white border-gray-300' : 'bg-slate-800 border-slate-600'} focus:ring-sky-500 focus:ring-2`}
              />
              <div className="flex-1">
                <span className={`text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>Auto-close registration when capacity is reached</span>
                <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>
                  Automatically close registration when the event reaches maximum capacity
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Info Box */}
        <div className={isLight ? 'rounded-lg border border-gray-200 bg-white p-3' : 'rounded-lg border border-slate-700 bg-slate-800/50 p-3'}>
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className={isLight ? 'text-xs text-gray-600' : 'text-xs text-slate-300'}>
              <p className={isLight ? 'font-medium mb-1 text-gray-900' : 'font-medium mb-1'}>Capacity Info</p>
              <p>
                {state.data.is_unlimited_capacity
                  ? 'This event allows unlimited registrations. Auto-close is disabled.'
                  : 'Capacity enforcement will be handled by the existing database functions. Admins can create events with registration closed, and the auto-close feature will prevent overbooking when enabled.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
