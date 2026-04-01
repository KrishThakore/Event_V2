"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    fullName?: string;
    phoneNumber?: string;
    organization?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email address';

    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (!fullName) newErrors.fullName = 'Full name is required';
    else if (fullName.length < 2) newErrors.fullName = 'Full name must be at least 2 characters';

    if (!phoneNumber) newErrors.phoneNumber = 'Phone number is required';
    else if (!/^\d{10,15}$/.test(phoneNumber.replace(/\D/g, ''))) newErrors.phoneNumber = 'Please enter a valid phone number';

    if (!organization) newErrors.organization = 'Institution or organization is required';
    else if (organization.trim().length < 3) newErrors.organization = 'Please enter at least 3 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: keyof typeof errors, value: string) => {
    setErrors((prev) => ({ ...prev, [field]: '' }));

    switch (field) {
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
      case 'fullName':
        setFullName(value);
        break;
      case 'phoneNumber':
        setPhoneNumber(value.replace(/\D/g, ''));
        break;
      case 'organization':
        setOrganization(value);
        break;
    }
  };

  const isFormValid = () =>
    Boolean(email && password && fullName && phoneNumber && organization.trim().length >= 3);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    const toastId = toast.loading('Creating your Joules Events account...');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phoneNumber,
          university: organization.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create account');

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pending_signup_email', email);
        sessionStorage.setItem('pending_signup_password', password);
      }

      toast.success('Verification code sent. Check your inbox.', { id: toastId });
      router.push(`/otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Unable to create account', { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_35%),linear-gradient(135deg,#f8fafc,#eef6ff_45%,#fdf2f8)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden bg-[radial-gradient(circle_at_20%_20%,rgba(125,211,252,0.25),transparent_30%),linear-gradient(160deg,#0f172a,#0b3b66_55%,#1d4ed8)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <BrandMark inverse stacked subtitle="Create • host • scale" />
            <div className="max-w-md">
              <p className="mb-3 text-sm font-black uppercase tracking-[0.24em] text-sky-200/80">Joules Events Network</p>
              <h1 className="text-5xl font-black leading-[0.9] tracking-tight">Build your next event presence in minutes.</h1>
              <p className="mt-5 text-base font-medium leading-7 text-sky-100/80">
                Join a platform designed for campus festivals, creator meetups, launches, hackathons, workshops, and premium ticketed experiences.
              </p>
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <div className="mb-8 text-center lg:text-left">
              <div className="mb-4 lg:hidden">
                <BrandMark stacked className="items-center" subtitle="Create your account" />
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950">Create Account</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Set up your Joules Events profile and start registering, hosting, and managing event access.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 text-slate-900 outline-none transition ${
                    errors.fullName ? 'border-red-500' : 'border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                    className={`w-full rounded-xl border px-4 py-3 text-slate-900 outline-none transition ${
                      errors.phoneNumber ? 'border-red-500' : 'border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
                    }`}
                    placeholder="Enter phone number"
                  />
                  {errors.phoneNumber && <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Institution / Organization</label>
                  <input
                    type="text"
                    required
                    value={organization}
                    onChange={(e) => handleFieldChange('organization', e.target.value)}
                    className={`w-full rounded-xl border px-4 py-3 text-slate-900 outline-none transition ${
                      errors.organization ? 'border-red-500' : 'border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
                    }`}
                    placeholder="Your college, company, club, or community"
                  />
                  {errors.organization && <p className="mt-1 text-sm text-red-600">{errors.organization}</p>}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 text-slate-900 outline-none transition ${
                    errors.email ? 'border-red-500' : 'border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
                  }`}
                  placeholder="Enter your email"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    className={`w-full rounded-xl border px-4 py-3 pr-12 text-slate-900 outline-none transition ${
                      errors.password ? 'border-red-500' : 'border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
                    }`}
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading || !isFormValid()}
                className="w-full rounded-xl bg-[linear-gradient(135deg,#0f172a,#0b3b66_55%,#1d4ed8)] px-4 py-3 font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_50px_rgba(15,23,42,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-sky-700 transition-colors hover:text-sky-800">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
