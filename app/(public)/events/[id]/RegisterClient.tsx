"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { BRAND_NAME } from '@/lib/brand';

const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';
const FILES_BUCKET = 'registration-files';

interface RegistrationFormField {
  id: string;
  label: string;
  field_type: string;
  required: boolean;
  options?: string[] | null;
}

interface RegisterClientProps {
  eventId: string;
  formFields: RegistrationFormField[];
}

interface AnswerPayload {
  field_id: string;
  value: string;
}

export function RegisterClient({ eventId, formFields }: RegisterClientProps) {
  const [loading, setLoading] = useState(false);
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [fileValues, setFileValues] = useState<Record<string, File | null>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [razorpayTermsAccepted, setRazorpayTermsAccepted] = useState(false);
  const [refundPolicyAccepted, setRefundPolicyAccepted] = useState(false);

  function handleTextChange(fieldId: string, value: string) {
    setTextValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleFileChange(fieldId: string, file: File | null) {
    setFileValues((prev) => ({ ...prev, [fieldId]: file }));
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
    setLoading(true);
    const toastId = toast.loading('Processing registration...');
    try {
      // Validate legal checkboxes
      if (!termsAccepted) {
        throw new Error('You must accept the Terms of Service to continue');
      }
      if (!privacyAccepted) {
        throw new Error('You must accept the Privacy Policy to continue');
      }
      if (!razorpayTermsAccepted) {
        throw new Error('You must accept the Razorpay Terms and Conditions to continue');
      }
      if (!refundPolicyAccepted) {
        throw new Error('You must accept the Refund Policy to continue');
      }

      const answers = await buildAnswers();
      const endpoint = PAYMENTS_ENABLED ? '/api/register-event' : '/api/register-event-test';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, answers })
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
            toast('You can reopen your ticket later once payment is processed.');
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
                amount: data.amount * 100
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

      // Razorpay is loaded globally by checkout.js script
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Registration failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  if (!formFields || formFields.length === 0) {
    return (
      <Button 
        onClick={(e) => handleRegister(e as any)}
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {loading ? 'Processing…' : 'Register'}
      </Button>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {formFields.map((field) => {
        const isFile = field.field_type === 'file';
        const isSelect = field.field_type === 'select' && field.options && field.options.length > 0;
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
            I have read and agree to the{' '}
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
            I have read and agree to the{' '}
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
            I have read and agree to the{' '}
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
            I have read and agree to the{' '}
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
          <li>• All payments are processed in Indian Rupees (INR)</li>
          <li>• Payment processing is handled by Razorpay (PCI DSS compliant)</li>
          <li>• Your payment information is encrypted and secure</li>
          <li>• Transaction fees may apply as per Razorpay's policies</li>
          <li>• Refunds are processed as per our Refund Policy</li>
        </ul>
      </div>
    </div>

    <Button
      type="submit"
      disabled={loading || !termsAccepted || !privacyAccepted || !razorpayTermsAccepted || !refundPolicyAccepted}
      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Processing…' : 'Complete Registration'}
    </Button>
  </form>
  );
}
