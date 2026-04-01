"use client";

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { formatINR, formatPrice, getCurrencySymbol } from '@/lib/currency';
import { getISTDateYYYYMMDD } from '@/lib/date';
import { BRAND_NAME } from '@/lib/brand';
import { Check, Info, ExternalLink, ArrowRight, ShieldCheck } from 'lucide-react';

const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';
const FILES_BUCKET = 'registration-files';

/**
 * Dynamically loads the Razorpay checkout script on demand.
 * Returns a promise that resolves once the script is loaded.
 * Safe to call multiple times — cached after first load.
 */
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve();
      return;
    }
    const existing = document.getElementById('razorpay-checkout-js');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

interface RegistrationFormField {
  id: string;
  label: string;
  field_type: string;
  required: boolean;
  options?: string[] | null;
  condition?: {
    field_id: string;
    value: string;
  };
}

interface PricingOption {
  id: string;
  label: string;
  price: number;
  currency?: string;
  price_inr?: number;
  price_usd?: number;
}

interface RegisterClientProps {
  eventId: string;
  formFields: RegistrationFormField[];
  event?: any;
  pricingOptions?: PricingOption[] | null;
  hasRegistered?: boolean;
  hasPendingRegistration?: boolean;
  isPendingVerification?: boolean;
  pendingRegistrationId?: string;
}

interface AnswerPayload {
  field_id: string;
  value: string;
}

export function RegisterClient({ 
  eventId, 
  formFields, 
  event, 
  pricingOptions, 
  hasRegistered,
  hasPendingRegistration,
  isPendingVerification,
  pendingRegistrationId
}: RegisterClientProps) {
  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [fileValues, setFileValues] = useState<Record<string, File | null>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [razorpayTermsAccepted, setRazorpayTermsAccepted] = useState(false);
  const [refundPolicyAccepted, setRefundPolicyAccepted] = useState(false);
  const [selectedPricingOption, setSelectedPricingOption] = useState<string>('');
  const [pricingError, setPricingError] = useState<string>('');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string>('');
  const [qfixConfirmed, setQfixConfirmed] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [showUSDInstructions, setShowUSDInstructions] = useState(false);
  const [paymentActive, setPaymentActive] = useState(false);

  // Generate a unique session ID for this page load to track live stats
  const sessionId = useMemo(() => {
    if (typeof window !== 'undefined') {
      return Math.random().toString(36).substring(2, 15);
    }
    return '';
  }, []);

  // Determine currency from event or selected pricing option
  const eventCurrency = event?.currency || 'INR';
  const selectedOption = pricingOptions?.find(o => o.id === selectedPricingOption);
  
  // Dual region logic: use region_labels array
  const isDual = event?.use_dual_region_pricing === true;
  const regionLabels: Array<{id: string; label: string; currency: 'INR' | 'USD'}> = 
    Array.isArray(event?.region_labels) ? event.region_labels : [];
  const selectedRegionObj = regionLabels.find(rl => rl.id === selectedRegion);
  
  const activeCurrency = isDual 
    ? (selectedRegionObj?.currency || 'INR')
    : (selectedOption?.currency || eventCurrency);
    
  const activePrice = isDual
    ? (event?.pricing_type === 'custom' 
        ? (selectedRegionObj?.currency === 'INR' ? selectedOption?.price_inr : selectedOption?.price_usd)
        : (selectedRegionObj?.currency === 'INR' ? event?.price_inr : event?.price_usd)
      )
    : selectedOption?.price || event?.price;

  const isUSD = activeCurrency === 'USD';
  const qfixLink = event?.qfix_link || event?.default_qfix_link || '';

  // Check if registration is open
  const todayString = getISTDateYYYYMMDD();
  // Ensure we compare YYYY-MM-DD strings
  const eventDateStr = typeof event?.event_date === 'string' 
    ? event.event_date 
    : (event?.event_date instanceof Date ? event.event_date.toISOString().split('T')[0] : null);
  
  const dateAllowsRegistration = eventDateStr ? eventDateStr >= todayString : true;
  const isRegistrationOpen = event?.is_registration_open === true && dateAllowsRegistration;

  // Live Stats Heartbeat
  useEffect(() => {
    // Only count as "filling form" if they haven't registered and registration is open
    const isActuallyFillingForm = !hasRegistered && !hasPendingRegistration && isRegistrationOpen;
    if (!sessionId || !isActuallyFillingForm) return;

    const sendHeartbeat = () => {
      fetch('/api/stats/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          type: paymentActive ? 'razorpay' : 'form_filling'
        })
      }).catch(() => {}); // Silent fail
    };

    // Send initial heartbeat
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, 20000); // Every 20 seconds
    return () => clearInterval(interval);
  }, [sessionId, paymentActive, hasRegistered, hasPendingRegistration, isRegistrationOpen]);

  // Debug logging with more details
  console.log('[DEBUG] RegisterClient - Initialization:', {
    eventId,
    eventPricingType: event?.pricing_type,
    hasEvent: !!event,
    hasPricingOptionsProp: !!pricingOptions,
    pricingOptionsCount: pricingOptions?.length || 0,
    pricingOptionsSample: pricingOptions?.slice(0, 2) || 'none',
    isCustomPricing: event?.pricing_type === 'custom',
    eventStatus: event?.status,
    registrationOpen: event?.is_registration_open,
    timestamp: new Date().toISOString()
  });

  function handleTextChange(fieldId: string, value: string) {
    setTextValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleFileChange(fieldId: string, file: File | null) {
    setFileValues((prev) => ({ ...prev, [fieldId]: file }));
  }

  function handlePricingOptionChange(value: string) {
    console.log('[DEBUG] Pricing option selected:', {
      selectedValue: value,
      optionDetails: pricingOptions?.find(opt => opt.id === value) || 'Not found',
      timestamp: new Date().toISOString()
    });
    setSelectedPricingOption(value);
    setPricingError(''); // Clear error when option is selected
  }

  async function uploadFile(fieldId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'registration-attachments');
    
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'File upload failed');
    }
    
    return data.url;
  }

  async function buildAnswers(): Promise<AnswerPayload[]> {
    const answers: AnswerPayload[] = [];

    for (const field of formFields) {
      // Check visibility
      const isVisible = !field.condition || textValues[field.condition.field_id] === field.condition.value;
      if (!isVisible) continue;

      if (field.field_type === 'file') {
        const file = fileValues[field.id] || null;
        if (file) {
          const url = await uploadFile(field.id, file);
          answers.push({ field_id: field.id, value: url });
        } else if (field.required) {
          throw new Error(`Please upload a file for "${field.label}"`);
        }
      } else {
        const value = textValues[field.id] ?? '';
        if (field.required && !value.trim()) {
          throw new Error(`Please fill out "${field.label}"`);
        }
        if (value.trim()) {
          answers.push({ field_id: field.id, value: value.trim() });
        }
      }
    }

    return answers;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    
    // Check if registration is open
    if (!isRegistrationOpen) {
      toast.error('Registration is closed for this event');
      return;
    }
    
    setLoading(true);
    const toastId = toast.loading('Processing registration...');
    try {
      // Validate legal checkboxes
      if (!termsAccepted) {
        throw new Error('You must accept Terms of Service to continue');
      }
      if (!privacyAccepted) {
        throw new Error('You must accept Privacy Policy to continue');
      }
      if (!isUSD && !razorpayTermsAccepted) {
        throw new Error('You must accept Razorpay Terms and Conditions to continue');
      }
      if (!refundPolicyAccepted) {
        throw new Error('You must accept Refund Policy to continue');
      }

      // Check for USD instructions first if no proof yet
      if (isUSD && !paymentProofUrl && !showUSDInstructions) {
        setShowUSDInstructions(true);
        toast.info('Please follow the payment instructions');
        toast.dismiss(toastId);
        setLoading(false);
        return;
      }

      if (isUSD) {
        if (!paymentProofUrl) {
          setShowUSDInstructions(true);
          toast.dismiss(toastId);
          // If the modal was already open, show the error. If not, don't show error yet, just show modal.
          if (showUSDInstructions) {
            throw new Error('Please upload your payment proof before final submission');
          }
          setLoading(false);
          return;
        }
        if (!qfixConfirmed) {
          setShowUSDInstructions(true);
          toast.dismiss(toastId);
          throw new Error('Please confirm that you have completed the QFIX payment');
        }
      }

      // Validate custom pricing selection
      if (event?.pricing_type === 'custom') {
        const hasPricingOptions = Array.isArray(pricingOptions) && pricingOptions.length > 0;
        console.log('[DEBUG] Pricing validation - start:', { 
          hasPricingOptions, 
          pricingOptionsCount: pricingOptions?.length || 0,
          selectedPricingOption,
          pricingOptionsSample: pricingOptions?.slice(0, 2) || 'none',
          timestamp: new Date().toISOString()
        });
        
        if (!hasPricingOptions) {
          console.error('[ERROR] No pricing options available for custom pricing event:', {
            eventId: event?.id,
            pricingType: event?.pricing_type,
            pricingOptions,
            timestamp: new Date().toISOString()
          });
          throw new Error('Pricing options are not configured for this event. Please contact the organizer.');
        }
        
        if (!selectedPricingOption) {
          console.log('[DEBUG] No pricing option selected, showing error');
          setPricingError('Please select a pricing option to continue');
          throw new Error('Please select a pricing option to continue');
        }
        
        console.log('[DEBUG] Pricing validation - success:', {
          selectedOption: pricingOptions.find(opt => opt.id === selectedPricingOption),
          timestamp: new Date().toISOString()
        });
      }

      const answers = await buildAnswers();
      const payload: any = { event_id: eventId, answers };
      
      // Include pricing option for custom pricing events
      if (event?.pricing_type === 'custom' && selectedPricingOption) {
        payload.selected_pricing_option_id = selectedPricingOption;
      }
      
      // Include region selection for dual-region events
      if (isDual && selectedRegionObj) {
        payload.selected_region_label = selectedRegionObj.label;
        payload.selected_region_currency = selectedRegionObj.currency;
      }

      // For USD/QFIX payments, include payment method and proof
      if (isUSD) {
        payload.payment_method = 'qfix';
        payload.payment_proof_url = paymentProofUrl;
      }

      const endpoint = PAYMENTS_ENABLED ? '/api/register-event' : '/api/register-event-test';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to register');
      }

      if (data.free || !PAYMENTS_ENABLED) {
        toast.success('Registration confirmed!', { id: toastId });
        if (data.registration_id) {
          window.location.href = `/tickets/${data.registration_id}`;
        }
        return;
      }

      // QFIX/USD payment — registration created with PENDING_VERIFICATION
      if (data.qfix || data.pending_verification) {
        toast.success('Registration submitted! Your payment is pending verification.', { id: toastId });
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
        return;
      }

      const options: any = {
        key: data.razorpay_key,
        amount: data.amount * 100,
        currency: 'INR',
        order_id: data.order_id,
        name: BRAND_NAME,
        description: 'Event registration',
        image: '/icon.png',
        theme: {
          color: '#9333ea'
        },
        modal: {
          ondismiss: function () {
            setPaymentActive(false);
            toast('Payment window closed. You can complete it later.');
          },
          escape: false,
          handleback: false,
          confirm: true,
          persistent: true,
          backdropclose: false,
          animation: true
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        notes: {
          event_id: eventId,
          user_id: data.user_id,
          event_title: 'Event Registration'
        },
        handler: async function (response: any) {
          toast.success('Payment completed! Confirming...', { id: toastId });
          try {
            // Manually confirm registration since test mode doesn't trigger webhooks
            const confirmRes = await fetch('/api/manual-confirm-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_id: eventId,
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id,
                amount: data.amount * 100,
                pricing_type: event?.pricing_type,
                pricing_option_id: selectedPricingOption || null,
                answers: await buildAnswers()
              })
            });
            const confirmData = await confirmRes.json();
            if (confirmData.success) {
              toast.success('Registration confirmed! Redirecting to tickets...');
              setTimeout(() => {
                window.location.href = `/tickets/${confirmData.registration_id}`;
              }, 2000);
            } else {
              toast.error('Payment successful but registration failed. Please contact support.');
            }
          } catch (error) {
            console.error('Confirmation error:', error);
            toast.error('Payment successful but confirmation failed. Please contact support.');
          }
        },
      };

      // Load Razorpay script on-demand (only when user actually pays)
      await loadRazorpayScript();

      // Razorpay is now loaded — open the payment modal
      const rzp = new window.Razorpay(options);
      setPaymentActive(true);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Registration failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  async function handleResumePayment() {
    if (!pendingRegistrationId) return;
    
    setResuming(true);
    const toastId = toast.loading('Reconnecting to payment gateway...');
    
    try {
      const endpoint = '/api/resume-payment';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: pendingRegistrationId })
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to resume payment');
      }

      // If the registration was automatically confirmed (e.g. became free)
      if (data.redirect_to_ticket) {
        toast.success('Registration confirmed!', { id: toastId });
        setTimeout(() => {
          window.location.href = `/tickets/${data.registration_id}`;
        }, 1500);
        return;
      }

      toast.dismiss(toastId);

      const options: any = {
        key: data.razorpay_key,
        amount: data.amount * 100,
        currency: 'INR',
        order_id: data.order_id,
        name: BRAND_NAME,
        description: 'Event registration payment',
        image: '/icon.png',
        theme: {
          color: '#9333ea'
        },
        modal: {
          ondismiss: function () {
            setPaymentActive(false);
            toast('Payment window closed. You can complete it later.');
          },
          escape: false,
          handleback: false,
          confirm: true,
          persistent: true,
          backdropclose: false,
          animation: true
        },
        handler: async function (response: any) {
          toast.loading('Confirming payment...', { id: toastId });
          try {
            const confirmRes = await fetch('/api/manual-confirm-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_id: eventId,
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id,
                amount: data.amount * 100,
                // Pass existing type/option (backend will fallback to what's saved)
                pricing_type: data.pricing_type,
                pricing_option_id: data.selected_pricing_option?.id || null
              })
            });
            const confirmData = await confirmRes.json();
            if (confirmData.success) {
              toast.success('Registration confirmed! Redirecting...', { id: toastId });
              setTimeout(() => {
                window.location.href = `/tickets/${confirmData.registration_id}`;
              }, 1500);
            } else {
              toast.error('Payment successful but registration failed. Contact support.', { id: toastId });
            }
          } catch (error) {
            console.error('Confirmation error:', error);
            toast.error('Payment successful but confirmation failed. Contact support.', { id: toastId });
          }
        },
        notes: {
          event_id: eventId,
          user_id: data.user_id,
          registration_id: pendingRegistrationId,
          is_resume: 'true'
        }
      };

      // Load Razorpay script on-demand (only when user resumes payment)
      await loadRazorpayScript();

      const rzp = new window.Razorpay(options);
      setPaymentActive(true);
      rzp.open();
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to open payment gateway', { id: toastId });
    } finally {
      setResuming(false);
    }
  }

  async function handleCancelRegistration() {
    if (!pendingRegistrationId) return;
    
    if (!confirm('Are you sure you want to cancel your incomplete registration and start over?')) {
      return;
    }

    setCanceling(true);
    const toastId = toast.loading('Canceling incomplete registration...');
    
    try {
      const res = await fetch('/api/cancel-pending-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: pendingRegistrationId })
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to cancel registration');
      }
      
      toast.success('Canceled. You can now register again.', { id: toastId });
      
      // Reload page to reset state completely
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to cancel', { id: toastId });
      setCanceling(false);
    }
  }

  if (hasRegistered) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-green-900 mb-2">Already Registered</h2>
          <p className="text-green-700 mb-4">
            You have already registered for this event. You can view your ticket in the dashboard.
          </p>
          <a 
            href="/tickets" 
            className="inline-block bg-green-600 text-white font-medium px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            View My Tickets
          </a>
        </div>
      </div>
    );
  }

  if (hasPendingRegistration) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-amber-900 mb-2">Incomplete Registration</h2>
          <p className="text-amber-700 mb-6">
            You previously started registering for this event but did not complete the payment. 
            Would you like to resume your payment or start a new registration?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleResumePayment}
              disabled={resuming || canceling}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-6 py-2"
            >
              {resuming ? 'Processing...' : 'Complete Payment'}
            </Button>
            <Button
              onClick={handleCancelRegistration}
              disabled={resuming || canceling}
              variant="outline"
              className="border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              {canceling ? 'Canceling...' : 'Start Over'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isRegistrationOpen) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">Registration Closed</h2>
          <p className="text-red-700 mb-4">
            Registration for this event is now closed. This could be because:
          </p>
          <ul className="text-left text-red-700 space-y-1 mb-4">
            <li>• The event has already passed</li>
            <li>• The event is happening today</li>
            <li>• The organizer has manually closed registration</li>
          </ul>
          <p className="text-red-600 text-sm">
            If you believe this is an error, please contact the event organizer.
          </p>
        </div>
      </div>
    );
  }


  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {/* Mobile-only overflow control */}
      <style jsx>{`
        @media (max-width: 480px) {
          form {
            overflow-x: hidden;
            max-width: 100vw;
            width: 100%;
          }
          .space-y-4 > * {
            max-width: 100%;
            box-sizing: border-box;
          }
          .flex {
            flex-wrap: wrap;
          }
          .w-full {
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box;
          }
          input[type="file"],
          input[type="text"],
          input[type="email"],
          input[type="tel"],
          input[type="number"] {
            max-width: 100%;
            width: 100%;
            box-sizing: border-box;
          }
          .bg-blue-50 {
            max-width: 100%;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          label {
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
          }
          a {
            word-break: break-all;
            max-width: 100%;
          }
        }
      `}</style>

      {/* Dual Region Selector - Dropdown */}
      {isDual && regionLabels.length > 0 && (
        <div className="space-y-3 bg-purple-50/50 p-4 rounded-xl border border-purple-100 mb-6">
          <label className="block text-sm font-semibold text-purple-900">
            {event.dual_region_label || 'Where are you from?'} <span className="text-red-500">*</span>
          </label>
          <Select value={selectedRegion} onValueChange={(value) => {
            setSelectedRegion(value);
            // Reset pricing option when region changes
            if (event?.pricing_type === 'custom') {
              setSelectedPricingOption('');
            }
          }}>
            <SelectTrigger className="w-full bg-white border-purple-200">
              <SelectValue placeholder="Select your region" />
            </SelectTrigger>
            <SelectContent>
              {regionLabels.map((rl) => (
                <SelectItem key={rl.id} value={rl.id} className="text-black hover:bg-purple-100">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${rl.currency === 'INR' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {rl.currency === 'INR' ? '₹' : '$'}
                    </span>
                    {rl.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRegionObj && (
            <p className="text-xs text-purple-600">
              {selectedRegionObj.currency === 'INR' 
                ? 'Payment will be processed in Indian Rupees (INR) via Razorpay' 
                : 'Payment will be processed in US Dollars (USD) via QFIX'}
            </p>
          )}
        </div>
      )}

      {/* Custom Pricing Dropdown */}
      {event?.pricing_type === 'custom' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {event.pricing_dropdown_label || 'Select Pricing Option'} <span className="ml-1 text-red-500">*</span>
          </label>
          
          {Array.isArray(pricingOptions) && pricingOptions.length > 0 ? (
            <>
              <Select value={selectedPricingOption} onValueChange={handlePricingOptionChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {pricingOptions.map((option) => {
                    const displayPrice = isDual 
                      ? (selectedRegionObj?.currency === 'INR' ? option.price_inr : option.price_usd)
                      : option.price;
                    const displayCurrency = isDual ? activeCurrency : (option.currency || eventCurrency);
                    
                    // In dual mode, hide options with no price for the selected region
                    if (isDual && (displayPrice === undefined || displayPrice === 0)) {
                      return null;
                    }

                    return (
                      <SelectItem key={option.id} value={option.id} className="text-black hover:bg-purple-100">
                        {option.label} - {formatPrice(displayPrice || 0, displayCurrency)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {pricingError && (
                <p className="text-sm text-red-600">{pricingError}</p>
              )}
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                Pricing options are not configured for this event. Please contact the organizer.
              </p>
            </div>
          )}
        </div>
      )}

      {formFields.map((field) => {
        const isVisible = !field.condition || textValues[field.condition.field_id] === field.condition.value;
        if (!isVisible) return null;

        const isFile = field.field_type === 'file';
        const isSelect = field.field_type === 'select' && field.options && field.options.length > 0;
        const isTextArea = field.field_type === 'textarea';
        const isRadio = field.field_type === 'radio' && field.options && field.options.length > 0;
        const isCheckbox = field.field_type === 'checkbox' && field.options && field.options.length > 0;
        const inputType = field.field_type === 'number' ? 'number' : field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text';

        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {isFile ? (
              <Input
                type="file"
                variant="light"
                onChange={(e) => handleFileChange(field.id, e.target.files?.[0] || null)}
                className="w-full"
              />
            ) : isSelect ? (
              <Select value={textValues[field.id] ?? ''} onValueChange={(value) => handleTextChange(field.id, value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {field.options!.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-black hover:bg-purple-100">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : isTextArea ? (
              <textarea
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={4}
                value={textValues[field.id] ?? ''}
                onChange={(e) => handleTextChange(field.id, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            ) : isRadio ? (
              <div className="space-y-2">
                {field.options!.map((opt) => (
                  <div key={opt} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`${field.id}-${opt}`}
                      name={field.id}
                      value={opt}
                      checked={textValues[field.id] === opt}
                      onChange={(e) => handleTextChange(field.id, e.target.value)}
                      className="h-4 w-4 border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor={`${field.id}-${opt}`} className="text-sm text-gray-700">
                      {opt}
                    </label>
                  </div>
                ))}
              </div>
            ) : isCheckbox ? (
              <div className="space-y-2">
                {field.options!.map((opt) => {
                  const currentValues = (textValues[field.id] || '').split(',').filter(Boolean);
                  const isChecked = currentValues.includes(opt);
                  return (
                    <div key={opt} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`${field.id}-${opt}`}
                        checked={isChecked}
                        onChange={(e) => {
                          let nextValues;
                          if (e.target.checked) {
                            nextValues = [...currentValues, opt];
                          } else {
                            nextValues = currentValues.filter((v) => v !== opt);
                          }
                          handleTextChange(field.id, nextValues.join(','));
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <label htmlFor={`${field.id}-${opt}`} className="text-sm text-gray-700">
                        {opt}
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Input
                type={inputType}
                variant="light"
                value={textValues[field.id] ?? ''}
                onChange={(e) => handleTextChange(field.id, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                className="w-full"
              />
            )}
          </div>
        );
      })}

      {/* Legal Agreements Section */}
      <div className="space-y-4 border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900">Legal Agreements</h3>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            />
            <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
              I have read and agree to{' '}
              <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Terms of Service
              </a>
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="privacy"
              checked={privacyAccepted}
              onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
            />
            <label htmlFor="privacy" className="text-sm text-gray-700 leading-relaxed">
              I have read and agree to{' '}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="razorpay-terms"
              checked={razorpayTermsAccepted}
              onCheckedChange={(checked) => setRazorpayTermsAccepted(checked as boolean)}
            />
            <label htmlFor="razorpay-terms" className="text-sm text-gray-700 leading-relaxed">
              I have read and agree to{' '}
              <a href="https://razorpay.com/terms/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Razorpay Terms and Conditions
              </a>{' '}
              for payment processing
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="refund-policy"
              checked={refundPolicyAccepted}
              onCheckedChange={(checked) => setRefundPolicyAccepted(checked as boolean)}
            />
            <label htmlFor="refund-policy" className="text-sm text-gray-700 leading-relaxed">
              I have read and agree to{' '}
              <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Refund Policy
              </a>
            </label>
          </div>
        </div>

        {/* Payment Disclosure */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Payment Information</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              {isUSD ? (
                <>
                  <li>• Payments are in US Dollars (USD) via QFIX</li>
                  <li>• You must upload payment proof after making payment</li>
                  <li>• Registration is confirmed after admin verification</li>
                </>
              ) : (
                <>
                  <li>• All payments are processed in Indian Rupees (INR)</li>
                  <li>• Payment processing is handled by Razorpay (PCI DSS compliant)</li>
                  <li>• Your payment information is encrypted and secure</li>
                  <li>• Transaction fees may apply as per Razorpay's policies</li>
                </>
              )}
              <li>• Refunds are processed as per our Refund Policy</li>
            </ul>
          </div>
      </div>

      <Button
        type="submit"
        disabled={
          loading || 
          !termsAccepted || 
          !privacyAccepted || 
          (!isUSD && !razorpayTermsAccepted) || 
          !refundPolicyAccepted ||
          (event?.pricing_type === 'custom' && (!selectedPricingOption || !pricingOptions || pricingOptions.length === 0))
        }
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg shadow-purple-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        <span className="flex items-center justify-center gap-2">
          {loading ? (
            'Processing...'
          ) : (
            <>
              Register
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </span>
      </Button>

      {/* USD Payment Instructions Modal */}
      {showUSDInstructions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <ShieldCheck className="w-24 h-24" />
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight mb-2">USD Registration</h3>
              <p className="text-blue-100 text-sm font-medium">Follow these steps to complete your registration.</p>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8">
              {!qfixConfirmed ? (
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl border border-blue-100 shadow-sm">
                    1
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-bold text-gray-900 text-lg">External Payment Portal</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Click the button below to open the QFIX payment gateway. Complete your payment securely on their platform.
                    </p>
                    <Button 
                      type="button"
                      onClick={() => {
                        if (qfixLink) {
                          window.open(qfixLink, '_blank');
                          setQfixConfirmed(true);
                        } else {
                          toast.error('Payment link not found');
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 py-2.5 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                      Go to QFIX Portal
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-6 animate-in slide-in-from-left duration-500">
                   <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center font-black text-xl border border-green-100 shadow-sm">
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-lg">Payment Portal Opened</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Please complete your payment on the QFIX portal.
                    </p>
                    <button 
                      type="button"
                      onClick={() => qfixLink && window.open(qfixLink, '_blank')}
                      className="text-blue-600 text-xs font-semibold hover:underline flex items-center gap-1"
                    >
                      Re-open portal <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              <div className={`flex gap-6 relative transition-opacity duration-300 ${!qfixConfirmed ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                {qfixConfirmed && <div className="absolute left-6 -top-8 bottom-12 w-0.5 bg-gray-100 -z-10" />}
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-xl border border-purple-100 shadow-sm">
                  2
                </div>
                <div className="space-y-3 w-full">
                  <h4 className="font-bold text-gray-900 text-lg">Upload Proof of Payment</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Once paid, upload your receipt or screenshot here. Required for verification.
                  </p>
                  
                  {paymentProofUrl ? (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                        <Check className="w-4 h-4" />
                        Proof Uploaded
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setPaymentProofUrl('');
                          setPaymentProofFile(null);
                        }}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                       <Input
                        type="file"
                        variant="light"
                        accept="image/*,.pdf"
                        disabled={uploadingProof}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          setUploadingProof(true);
                          const tid = toast.loading('Uploading proof...');
                          try {
                            const url = await uploadFile('payment_proof', file);
                            setPaymentProofUrl(url);
                            setPaymentProofFile(file);
                            toast.success('Proof uploaded!', { id: tid });
                          } catch (err: any) {
                            toast.error(err.message || 'Upload failed', { id: tid });
                          } finally {
                            setUploadingProof(false);
                          }
                        }}
                        className="w-full"
                      />
                      {uploadingProof && <p className="text-[10px] text-blue-600 animate-pulse">Uploading to secure server...</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-3">
              {paymentProofUrl ? (
                <Button 
                  type="button"
                  onClick={handleRegister}
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? 'Processing...' : 'Complete Registration'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
              ) : (
                <Button 
                  type="button"
                  onClick={() => setShowUSDInstructions(false)}
                  variant="outline"
                  className="flex-1 py-4 rounded-xl border-gray-200 text-gray-600 font-bold hover:bg-gray-100"
                >
                  I'll do this later
                </Button>
              )}
              <Button 
                type="button"
                variant="ghost"
                onClick={() => setShowUSDInstructions(false)}
                className="px-6 rounded-xl text-gray-400 font-bold hover:text-gray-600"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </form>
  );
}
