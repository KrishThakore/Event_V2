'use client';

import { useCreateEvent, PricingOption, RegionLabel } from './CreateEventProvider';
import { getCurrencySymbol } from '@/lib/currency';
import { useEffect, useState } from 'react';

export function PricingSection({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const { state, updateField, setError, clearError } = useCreateEvent();
  const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED !== 'false';
  const [defaultQfixLink, setDefaultQfixLink] = useState<string>('');

  const isLight = variant === 'light';
  const headerBorder = isLight ? 'border-b border-gray-200 pb-2' : 'border-b border-slate-700 pb-2';
  const headerTitle = isLight ? 'text-lg font-semibold text-gray-900' : 'text-lg font-semibold text-white';
  const headerDesc = isLight ? 'text-sm text-gray-600' : 'text-sm text-slate-400';
  const labelClass = isLight ? 'block text-sm font-medium text-gray-700 mb-2' : 'block text-sm font-medium text-slate-300 mb-2';
  const inputBase = isLight
    ? 'block w-full pl-7 pr-12 py-2 rounded-lg border bg-white text-gray-700 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500'
    : 'block w-full pl-7 pr-12 py-2 rounded-lg border bg-slate-800 text-white placeholder:slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500';

  const currencySymbol = getCurrencySymbol(state.data.currency === 'DUAL' ? 'INR' : state.data.currency);

  // Fetch the default QFIX link from admin settings
  useEffect(() => {
    fetch('/api/admin/settings?key=default_qfix_link')
      .then(res => res.json())
      .then(data => {
        if (data.value) setDefaultQfixLink(data.value);
      })
      .catch(() => {});
  }, []);

  const handlePriceChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    updateField('price', numValue);
    
    if (state.data.event_type === 'paid' && state.data.currency !== 'DUAL' && numValue <= 0) {
      setError('price', 'Price must be greater than 0 for paid events');
    } else {
      clearError('price');
    }
  };

  const handleEventTypeChange = (eventType: 'free' | 'paid' | 'custom') => {
    updateField('event_type', eventType);
    
    // Clear price error when switching to free or custom
    if (eventType === 'free' || eventType === 'custom') {
      clearError('price');
    } else if (state.data.currency !== 'DUAL' && state.data.price <= 0) {
      setError('price', 'Price must be greater than 0 for paid events');
    }

    // Reset currency to INR when switching to free
    if (eventType === 'free') {
      updateField('currency', 'INR');
    }
  };

  const handleCurrencyToggle = (currency: 'INR' | 'USD' | 'DUAL') => {
    updateField('currency', currency);
    // Reset QFIX link settings when switching to INR
    if (currency === 'INR') {
      updateField('use_custom_qfix_link', false);
      updateField('qfix_link', '');
      updateField('use_dual_region_pricing', false);
    }
    if (currency === 'DUAL') {
      updateField('use_dual_region_pricing', true);
    } else {
      updateField('use_dual_region_pricing', false);
    }
  };

  const addRegionLabel = (currency: 'INR' | 'USD') => {
    const newLabel: RegionLabel = {
      id: Date.now().toString(),
      label: '',
      currency
    };
    updateField('region_labels', [...state.data.region_labels, newLabel]);
  };

  const updateRegionLabel = (id: string, label: string) => {
    const updated = state.data.region_labels.map(rl =>
      rl.id === id ? { ...rl, label } : rl
    );
    updateField('region_labels', updated);
  };

  const removeRegionLabel = (id: string) => {
    const updated = state.data.region_labels.filter(rl => rl.id !== id);
    updateField('region_labels', updated);
  };

  const showCurrencyToggle = state.data.event_type === 'paid' || state.data.event_type === 'custom';

  // Check if QFIX link should be shown: only when USD is actively the currency or when dual-region has USD labels
  const hasUSDUsage = 
    state.data.currency === 'USD' || 
    (state.data.currency === 'DUAL' && state.data.region_labels.some(rl => rl.currency === 'USD')) ||
    (state.data.event_type === 'custom' && (
      state.data.pricing_options.some(opt => opt.currency === 'USD') ||
      (state.data.use_dual_region_pricing && state.data.region_labels.some(rl => rl.currency === 'USD'))
    ));

  return (
    <div className="space-y-6">
      {!paymentsEnabled && (
        <div className="rounded-md border border-amber-500/60 bg-amber-950/60 px-4 py-3 text-xs text-amber-100">
          Payments are disabled (Test Mode). Paid events will behave as free for testing.
        </div>
      )}
      <div className={headerBorder}>
        <h2 className={headerTitle}>Pricing & Payment</h2>
        <p className={headerDesc}>Set event pricing and payment options</p>
      </div>

      <div className="space-y-6">
        {/* Event Type */}
        <div>
          <label className={labelClass}>
            Event Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handleEventTypeChange('free')}
              className={`rounded-lg p-4 border-2 transition-colors ${
                state.data.event_type === 'free'
                  ? (isLight ? 'border-sky-500 bg-sky-50' : 'border-sky-500 bg-sky-500/10')
                  : (isLight ? 'border-gray-200 hover:border-gray-300 bg-white' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50')
              }`}
            >
              <div className="text-left">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Free</span>
                  {state.data.event_type === 'free' && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isLight ? 'bg-sky-100 text-sky-800' : 'bg-sky-100 text-sky-800'}`}>
                      Selected
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-sm ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>No payment required</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleEventTypeChange('paid')}
              className={`rounded-lg p-4 border-2 transition-colors ${
                state.data.event_type === 'paid'
                  ? (isLight ? 'border-green-500 bg-green-50' : 'border-green-500 bg-green-500/10')
                  : (isLight ? 'border-gray-200 hover:border-gray-300 bg-white' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50')
              }`}
            >
              <div className="text-left">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Paid</span>
                  {state.data.event_type === 'paid' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Selected
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-sm ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>Charge attendees to register</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleEventTypeChange('custom')}
              className={`rounded-lg p-4 border-2 transition-colors ${
                state.data.event_type === 'custom'
                  ? (isLight ? 'border-purple-500 bg-purple-50' : 'border-purple-500 bg-purple-500/10')
                  : (isLight ? 'border-gray-200 hover:border-gray-300 bg-white' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50')
              }`}
            >
              <div className="text-left">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Custom Pricing</span>
                  {state.data.event_type === 'custom' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Selected
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-sm ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>Multiple pricing options</p>
              </div>
            </button>
          </div>
        </div>

        {/* Currency Toggle - shown for Paid events (not custom, custom has its own currency per option) */}
        {state.data.event_type === 'paid' && (
          <div>
            <label className={labelClass}>Payment Currency</label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleCurrencyToggle('INR')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
                  state.data.currency === 'INR'
                    ? (isLight 
                        ? 'border-green-500 bg-green-50 text-green-800 shadow-sm' 
                        : 'border-green-500 bg-green-500/10 text-green-300')
                    : (isLight 
                        ? 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white' 
                        : 'border-slate-700 text-slate-400 hover:border-slate-600 bg-slate-800/50')
                }`}
              >
                <span className="text-lg">₹</span>
                <span>INR</span>
                <span className="text-xs opacity-75">(Razorpay)</span>
              </button>
              <button
                type="button"
                onClick={() => handleCurrencyToggle('USD')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
                  state.data.currency === 'USD'
                    ? (isLight 
                        ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm' 
                        : 'border-blue-500 bg-blue-500/10 text-blue-300')
                    : (isLight 
                        ? 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white' 
                        : 'border-slate-700 text-slate-400 hover:border-slate-600 bg-slate-800/50')
                }`}
              >
                <span className="text-lg">$</span>
                <span>USD</span>
                <span className="text-xs opacity-75">(QFIX)</span>
              </button>
              <button
                type="button"
                onClick={() => handleCurrencyToggle('DUAL')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
                  state.data.currency === 'DUAL'
                    ? (isLight 
                        ? 'border-purple-500 bg-purple-50 text-purple-800 shadow-sm' 
                        : 'border-purple-500 bg-purple-500/10 text-purple-300')
                    : (isLight 
                        ? 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white' 
                        : 'border-slate-700 text-slate-400 hover:border-slate-600 bg-slate-800/50')
                }`}
              >
                <span className="text-lg">₹/$</span>
                <span>Dual-Region</span>
                <span className="text-xs opacity-75">(INR + USD)</span>
              </button>
            </div>
            {state.data.currency === 'USD' && (
              <p className={`mt-2 text-xs ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                USD payments will use the QFIX payment link. Users will need to upload payment proof for verification.
              </p>
            )}
            {state.data.currency === 'DUAL' && (
              <p className={`mt-2 text-xs ${isLight ? 'text-purple-600' : 'text-purple-400'}`}>
                Dual-region pricing allows different prices for INR and USD regions. Users select their region during registration.
              </p>
            )}
          </div>
        )}

        {/* QFIX Link Configuration - shown ONLY when USD is being used */}
        {showCurrencyToggle && hasUSDUsage && (
          <div className={`rounded-lg border p-4 ${isLight ? 'border-blue-200 bg-blue-50' : 'border-blue-500/30 bg-blue-500/5'}`}>
            <label className={`block text-sm font-medium mb-3 ${isLight ? 'text-blue-900' : 'text-blue-300'}`}>
              QFIX Payment Link
            </label>
            
            <div className="space-y-3">
              {/* Option 1: Use general link */}
              <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                !state.data.use_custom_qfix_link
                  ? (isLight ? 'bg-blue-100 border border-blue-300' : 'bg-blue-500/10 border border-blue-500/30')
                  : (isLight ? 'bg-white border border-gray-200 hover:bg-gray-50' : 'bg-slate-800/50 border border-slate-700 hover:bg-slate-800')
              }`}>
                <input
                  type="radio"
                  name="qfix-link-type"
                  checked={!state.data.use_custom_qfix_link}
                  onChange={() => {
                    updateField('use_custom_qfix_link', false);
                    updateField('qfix_link', '');
                  }}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    Use general QFIX link
                  </span>
                  {defaultQfixLink ? (
                    <p className={`text-xs mt-1 ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>
                      Current: <span className="font-mono break-all">{defaultQfixLink}</span>
                    </p>
                  ) : (
                    <p className={`text-xs mt-1 ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                      ⚠ No general link set. Set it in Admin Dashboard → Settings.
                    </p>
                  )}
                </div>
              </label>

              {/* Option 2: Use custom link */}
              <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                state.data.use_custom_qfix_link
                  ? (isLight ? 'bg-blue-100 border border-blue-300' : 'bg-blue-500/10 border border-blue-500/30')
                  : (isLight ? 'bg-white border border-gray-200 hover:bg-gray-50' : 'bg-slate-800/50 border border-slate-700 hover:bg-slate-800')
              }`}>
                <input
                  type="radio"
                  name="qfix-link-type"
                  checked={state.data.use_custom_qfix_link}
                  onChange={() => updateField('use_custom_qfix_link', true)}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    Use custom QFIX link for this event
                  </span>
                  {state.data.use_custom_qfix_link && (
                    <input
                      type="url"
                      value={state.data.qfix_link || ''}
                      onChange={(e) => updateField('qfix_link', e.target.value)}
                      className={`mt-2 block w-full px-3 py-2 rounded-md border text-sm ${
                        isLight
                          ? 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500'
                          : 'border-slate-600 bg-slate-700 text-white placeholder:text-slate-400 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      placeholder="https://your-qfix-payment-link.com"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Dual-Region Price Inputs for Paid events */}
        {state.data.event_type === 'paid' && state.data.currency === 'DUAL' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="price_inr" className={labelClass}>
                INR Price (₹) <span className="text-red-400">*</span>
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className={`sm:text-sm ${isLight ? 'text-green-600' : 'text-green-400'}`}>₹</span>
                </div>
                <input
                  type="number"
                  id="price_inr"
                  value={state.data.price_inr || ''}
                  onChange={(e) => updateField('price_inr', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className={`${inputBase} ${isLight ? 'border-gray-300' : 'border-slate-600'}`}
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className={`sm:text-sm ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>INR</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">For users selecting INR regions (Razorpay)</p>
            </div>
            <div>
              <label htmlFor="price_usd" className={labelClass}>
                USD Price ($) <span className="text-red-400">*</span>
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className={`sm:text-sm ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>$</span>
                </div>
                <input
                  type="number"
                  id="price_usd"
                  value={state.data.price_usd || ''}
                  onChange={(e) => updateField('price_usd', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className={`${inputBase} ${isLight ? 'border-gray-300' : 'border-slate-600'}`}
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className={`sm:text-sm ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>USD</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">For users selecting USD regions (QFIX)</p>
            </div>
            {state.errors.price && (
              <p className="mt-1 text-sm text-red-400 col-span-2">{state.errors.price}</p>
            )}
          </div>
        )}

        {/* Single Price Input for Paid (INR or USD only) */}
        {state.data.event_type === 'paid' && state.data.currency !== 'DUAL' && (
          <div>
            <label htmlFor="price" className={labelClass}>
              Price per attendee <span className="text-red-400">*</span>
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className={`sm:text-sm ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>{currencySymbol}</span>
              </div>
              <input
                type="number"
                id="price"
                value={state.data.price || ''}
                onChange={(e) => handlePriceChange(e.target.value)}
                min="0"
                step="0.01"
                className={`${inputBase} ${state.errors.price ? 'border-red-500' : (isLight ? 'border-gray-300' : 'border-slate-600')}`}
                placeholder="0.00"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className={`sm:text-sm ${isLight ? 'text-gray-500' : 'text-slate-400'}`} id="price-currency">
                  {state.data.currency}
                </span>
              </div>
            </div>
            {state.errors.price && (
              <p className="mt-1 text-sm text-red-400">{state.errors.price}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Amount in {state.data.currency === 'USD' ? 'US Dollars (USD)' : 'Indian Rupees (INR)'}
            </p>
          </div>
        )}

        {/* Dynamic Region Labels - shown for Paid+DUAL or Custom+DualRegion */}
        {((state.data.event_type === 'paid' && state.data.currency === 'DUAL') || 
          (state.data.event_type === 'custom' && state.data.use_dual_region_pricing)) && (
          <div className={`rounded-lg border p-4 ${isLight ? 'border-purple-100 bg-purple-50/50' : 'border-purple-500/20 bg-purple-500/5'}`}>
            <div className="mb-4">
              <h4 className={`text-sm font-semibold ${isLight ? 'text-purple-900' : 'text-purple-300'}`}>Region Labels</h4>
              <p className={`text-xs ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>
                Add region options for users to select during registration. INR regions use Razorpay, USD regions use QFIX.
              </p>
            </div>

            {/* Selection Question */}
            <div className="mb-4">
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-purple-800' : 'text-purple-300'}`}>Selection Question</label>
              <input
                type="text"
                value={state.data.dual_region_label}
                onChange={(e) => updateField('dual_region_label', e.target.value)}
                className={`block w-full rounded-md border py-1.5 px-3 text-xs ${
                  isLight ? 'border-purple-200 bg-white' : 'border-purple-500/30 bg-slate-900/50'
                }`}
                placeholder="Where are you from?"
              />
            </div>

            {/* Add Region Label Buttons */}
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => addRegionLabel('INR')}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  isLight 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                + Add Region Label (INR)
              </button>
              <button
                type="button"
                onClick={() => addRegionLabel('USD')}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  isLight 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                + Add Region Label (USD)
              </button>
            </div>

            {/* Region Labels List */}
            <div className="space-y-2">
              {state.data.region_labels.map((rl) => (
                <div key={rl.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isLight ? 'border-gray-200 bg-white' : 'border-slate-700 bg-slate-800/50'
                }`}>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    rl.currency === 'INR' 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {rl.currency === 'INR' ? '₹ INR' : '$ USD'}
                  </span>
                  <input
                    type="text"
                    value={rl.label}
                    onChange={(e) => updateRegionLabel(rl.id, e.target.value)}
                    className={`flex-1 rounded-md border py-1.5 px-3 text-xs ${
                      isLight ? 'border-gray-200 bg-gray-50' : 'border-slate-600 bg-slate-700'
                    }`}
                    placeholder={rl.currency === 'INR' ? 'e.g., India, Dubai' : 'e.g., UK, USA'}
                  />
                  <button
                    type="button"
                    onClick={() => removeRegionLabel(rl.id)}
                    className={`p-1.5 rounded-md transition-colors ${
                      isLight ? 'text-red-500 hover:bg-red-50' : 'text-red-400 hover:bg-red-900/20'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}

              {state.data.region_labels.length === 0 && (
                <div className={`text-center py-4 rounded-lg border-2 border-dashed ${isLight ? 'border-purple-200 bg-purple-50/30' : 'border-purple-500/20 bg-purple-500/5'}`}>
                  <p className={`text-xs ${isLight ? 'text-purple-500' : 'text-purple-400'}`}>
                    No region labels added yet. Click the buttons above to add regions.
                  </p>
                </div>
              )}
            </div>

            {state.errors.region_labels && (
              <p className="mt-2 text-sm text-red-400">{state.errors.region_labels}</p>
            )}
          </div>
        )}

        {/* Custom Pricing Configuration */}
        {state.data.event_type === 'custom' && (
          <div className="space-y-6 border-t pt-6">
            <div>
              <h3 className={`text-lg font-medium ${isLight ? 'text-gray-900' : 'text-white'} mb-4`}>
                Custom Pricing Configuration
              </h3>
              
              {/* Dropdown Label */}
              <div className="mb-6">
                <label htmlFor="pricing_dropdown_label" className={labelClass}>
                  Dropdown Label <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="pricing_dropdown_label"
                  value={state.data.pricing_dropdown_label || ''}
                  onChange={(e) => updateField('pricing_dropdown_label', e.target.value)}
                  className={`${inputBase} ${state.errors.pricing_dropdown_label ? 'border-red-500' : (isLight ? 'border-gray-300' : 'border-slate-600')}`}
                  placeholder="e.g., Select Category, Choose Ticket Type, Who are you?"
                />
                {state.errors.pricing_dropdown_label && (
                  <p className="mt-1 text-sm text-red-400">{state.errors.pricing_dropdown_label}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  This label will be shown to users when they register
                </p>
              </div>

              {/* Pricing Options Builder */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className={labelClass}>
                    Pricing Options <span className="text-red-400">*</span>
                  </label>
                      <button
                    type="button"
                    onClick={() => {
                      const newOption: PricingOption = {
                        id: Date.now().toString(),
                        label: '',
                        price: 0,
                        currency: state.data.currency || 'INR'
                      };
                      updateField('pricing_options', [...state.data.pricing_options, newOption]);
                    }}
                    className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md ${
                      isLight 
                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    + Add Option
                  </button>
                </div>

                {state.errors.pricing_options && (
                  <p className="mb-4 text-sm text-red-400">{state.errors.pricing_options}</p>
                )}

                {/* Dual Region Pricing Toggle */}
                <div className={`mt-6 p-4 rounded-lg border ${isLight ? 'border-purple-100 bg-purple-50/50' : 'border-purple-500/20 bg-purple-500/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className={`text-sm font-semibold ${isLight ? 'text-purple-900' : 'text-purple-300'}`}>Dual-Region Pricing</h4>
                      <p className={`text-xs ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>Enable separate prices for Local (INR) and International (USD) registrations.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateField('use_dual_region_pricing', !state.data.use_dual_region_pricing)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        state.data.use_dual_region_pricing ? 'bg-purple-600' : 'bg-gray-400'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        state.data.use_dual_region_pricing ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {state.data.pricing_options.map((option, index) => (
                     <div key={option.id} className={`flex flex-col gap-3 p-4 rounded-xl border transition-all ${
                      isLight 
                        ? 'border-gray-200 bg-white hover:border-purple-200 shadow-sm' 
                        : 'border-slate-700 bg-slate-800/50 hover:border-purple-500/30'
                    }`}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                        {/* Label Input */}
                        <div className="flex-1 w-full">
                          <label className={`block text-[10px] font-bold mb-1 uppercase tracking-tight ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>Option Name</label>
                          <input
                            type="text"
                            value={option.label}
                            onChange={(e) => {
                              const updatedOptions = [...state.data.pricing_options];
                              updatedOptions[index] = { ...option, label: e.target.value };
                              updateField('pricing_options', updatedOptions);
                            }}
                            className={`block w-full rounded-lg border py-2 px-3 text-sm focus:ring-2 focus:ring-purple-500 transition-all ${
                              isLight 
                                ? 'border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-500' 
                                : 'border-slate-600 bg-slate-700 text-white placeholder:text-slate-400'
                            } ${state.errors[`pricing_option_${index}_label`] ? 'border-red-500' : ''}`}
                            placeholder="e.g., Student, USA Attendee"
                          />
                          {state.errors[`pricing_option_${index}_label`] && (
                            <p className="mt-1 text-[10px] text-red-500 font-medium tracking-tight">{state.errors[`pricing_option_${index}_label`]}</p>
                          )}
                        </div>

                        {/* Traditional Mode: Price + Currency Selector */}
                        {!state.data.use_dual_region_pricing && (
                          <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-center pt-1 sm:pt-0">
                            <div className={`flex p-1 rounded-lg border shadow-inner transition-all ${
                              isLight ? 'bg-gray-100 border-gray-200' : 'bg-slate-900/40 border-slate-700'
                            }`}>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedOptions = [...state.data.pricing_options];
                                  updatedOptions[index] = { ...option, currency: 'INR' };
                                  updateField('pricing_options', updatedOptions);
                                }}
                                className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all duration-200 ${
                                  option.currency === 'INR' 
                                    ? 'bg-green-600 text-white shadow-md scale-105' 
                                    : (isLight ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-200' : 'text-slate-300 hover:text-white hover:bg-slate-800/50')
                                }`}
                              >
                                ₹ INR
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedOptions = [...state.data.pricing_options];
                                  updatedOptions[index] = { ...option, currency: 'USD' };
                                  updateField('pricing_options', updatedOptions);
                                }}
                                className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all duration-200 ${
                                  option.currency === 'USD' 
                                    ? 'bg-blue-600 text-white shadow-md scale-105' 
                                    : (isLight ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-200' : 'text-slate-300 hover:text-white hover:bg-slate-800/50')
                                }`}
                              >
                                $ USD
                              </button>
                            </div>

                            <div className="w-28 relative">
                              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                <span className={`text-xs font-semibold ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>
                                  {getCurrencySymbol(option.currency)}
                                </span>
                              </div>
                              <input
                                type="number"
                                value={option.price || ''}
                                onChange={(e) => {
                                  const updatedOptions = [...state.data.pricing_options];
                                  updatedOptions[index] = { ...option, price: parseFloat(e.target.value) || 0 };
                                  updateField('pricing_options', updatedOptions);
                                }}
                                min="0"
                                step="0.01"
                                className={`block w-full pl-7 pr-2 py-2 text-sm rounded-lg border transition-all ${
                                  isLight 
                                    ? 'border-gray-300 bg-white text-gray-900' 
                                    : 'border-slate-600 bg-slate-700 text-white'
                                } ${state.errors[`pricing_option_${index}_price`] ? 'border-red-500' : ''}`}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        )}

                        {/* Remove Button for Single Mode */}
                        {!state.data.use_dual_region_pricing && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedOptions = state.data.pricing_options.filter((_, i) => i !== index);
                              updateField('pricing_options', updatedOptions);
                            }}
                            className={`p-2 rounded-lg transition-colors self-end sm:self-center ${
                              isLight 
                                ? 'text-red-500 hover:bg-red-50' 
                                : 'text-red-400 hover:bg-red-900/20'
                            }`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>

                      {/* Dual Region Mode: Side-by-side Pricing */}
                      {state.data.use_dual_region_pricing && (
                        <div className="flex flex-col sm:flex-row items-end gap-4 w-full border-t pt-3 border-dashed border-gray-200/50">
                          <div className="flex-1 w-full sm:w-auto grid grid-cols-2 gap-3">
                            <div>
                               <label className={`block text-[10px] font-bold mb-1 uppercase tracking-tight ${isLight ? 'text-green-700' : 'text-green-400'}`}>INR Price (₹)</label>
                               <div className="relative">
                                 <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                   <span className={`text-xs font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>₹</span>
                                 </div>
                                 <input
                                   type="number"
                                   value={option.price_inr || ''}
                                   onChange={(e) => {
                                     const updatedOptions = [...state.data.pricing_options];
                                     updatedOptions[index] = { ...option, price_inr: parseFloat(e.target.value) || 0 };
                                     updateField('pricing_options', updatedOptions);
                                   }}
                                   className={`block w-full pl-7 pr-2 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-green-500/50 transition-all ${
                                     isLight ? 'border-gray-200 bg-green-50/30' : 'border-slate-600 bg-slate-700'
                                   }`}
                                   placeholder="0.00"
                                 />
                               </div>
                            </div>
                            <div>
                               <label className={`block text-[10px] font-bold mb-1 uppercase tracking-tight ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>USD Price ($)</label>
                               <div className="relative">
                                 <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                   <span className={`text-xs font-bold ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>$</span>
                                 </div>
                                 <input
                                   type="number"
                                   value={option.price_usd || ''}
                                   onChange={(e) => {
                                     const updatedOptions = [...state.data.pricing_options];
                                     updatedOptions[index] = { ...option, price_usd: parseFloat(e.target.value) || 0 };
                                     updateField('pricing_options', updatedOptions);
                                   }}
                                   className={`block w-full pl-7 pr-2 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500/50 transition-all ${
                                     isLight ? 'border-gray-200 bg-blue-50/30' : 'border-slate-600 bg-slate-700'
                                   }`}
                                   placeholder="0.00"
                                 />
                               </div>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const updatedOptions = state.data.pricing_options.filter((_, i) => i !== index);
                              updateField('pricing_options', updatedOptions);
                            }}
                            className={`p-2 rounded-lg transition-colors mb-0.5 ${
                              isLight 
                                ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                                : 'text-red-400 bg-red-900/10 hover:bg-red-900/20'
                            }`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {state.data.pricing_options.length === 0 && (
                    <div className={`text-center py-8 rounded-lg border-2 border-dashed ${isLight ? 'border-gray-300 bg-gray-50' : 'border-slate-700 bg-slate-800/50'}`}>
                      <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>
                        No pricing options added yet. Click "Add Option" to get started.
                      </p>
                    </div>
                  )}
                </div>
                
                <p className="mt-2 text-xs text-gray-500">
                  Minimum 1 option required. Each option can have its own currency and price.{' '}
                  {state.data.pricing_options.some(opt => opt.currency === 'USD') && <span className="text-blue-500 font-medium">USD options will trigger QFIX payment.</span>}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="pt-2">
          <label className={isLight ? 'block text-sm font-medium text-gray-700 mb-2' : 'block text-sm font-medium text-slate-300 mb-2'}>
            Payment Methods
          </label>
          <div className="space-y-2">
            {state.data.currency === 'INR' || state.data.currency === 'DUAL' ? (
              <div className="flex items-center space-x-3">
                <input
                  id="razorpay-payment"
                  name="payment-method"
                  type="checkbox"
                  checked={true}
                  disabled
                  className={`h-4 w-4 rounded ${isLight ? 'border-gray-300 bg-white text-sky-500' : 'border-slate-600 bg-slate-800 text-sky-500'} focus:ring-sky-500`}
                />
                <div>
                  <label htmlFor="razorpay-payment" className={`block text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    Credit/Debit Card (Razorpay)
                  </label>
                  <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>Secure online payments via Razorpay</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <input
                  id="qfix-payment"
                  name="payment-method"
                  type="checkbox"
                  checked={true}
                  disabled
                  className={`h-4 w-4 rounded ${isLight ? 'border-gray-300 bg-white text-blue-500' : 'border-slate-600 bg-slate-800 text-blue-500'} focus:ring-blue-500`}
                />
                <div>
                  <label htmlFor="qfix-payment" className={`block text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    QFIX Payment (USD)
                  </label>
                  <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>External payment via QFIX link with proof upload</p>
                </div>
              </div>
            )}
            
            {state.data.currency === 'DUAL' && (
              <div className="flex items-center space-x-3">
                <input
                  id="qfix-payment-dual"
                  name="payment-method-dual"
                  type="checkbox"
                  checked={true}
                  disabled
                  className={`h-4 w-4 rounded ${isLight ? 'border-gray-300 bg-white text-blue-500' : 'border-slate-600 bg-slate-800 text-blue-500'} focus:ring-blue-500`}
                />
                <div>
                  <label htmlFor="qfix-payment-dual" className={`block text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    QFIX Payment (USD)
                  </label>
                  <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>For USD region registrations — external payment via QFIX</p>
                </div>
              </div>
            )}
            
            <div className="flex items-start space-x-3 pt-1">
              <div className="flex-shrink-0 pt-1">
                <input
                  id="offline-payment"
                  name="offline-payment"
                  type="checkbox"
                  disabled
                  className={`h-4 w-4 rounded ${isLight ? 'border-gray-300 bg-white text-gray-400' : 'border-slate-600 bg-slate-800 text-slate-400'} focus:ring-slate-500`}
                />
              </div>
              <div>
                <label htmlFor="offline-payment" className={`block text-sm font-medium ${isLight ? 'text-gray-700' : 'text-slate-400'}`}>
                  Offline Payment (Coming Soon)
                </label>
                <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-slate-500'}`}>
                  Enable cash, bank transfer, or other offline payment methods
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Test Mode Notice */}
        {state.data.event_type === 'paid' && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-300">Test Mode</h3>
                <div className="mt-2 text-sm text-amber-200">
                  <p>
                    {state.data.currency === 'INR'
                      ? 'Payments are in test mode. No real transactions will be processed. Use Razorpay sandbox/Test credentials to simulate payments.'
                      : state.data.currency === 'DUAL'
                      ? 'Dual-region: INR payments use Razorpay test mode. USD payments use QFIX with payment proof upload.'
                      : 'USD payments use the QFIX external payment link. Users must upload payment proof which requires admin/organizer verification.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
