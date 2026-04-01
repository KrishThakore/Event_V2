"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import BrandMark from '@/components/BrandMark';

export default function OtpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const OTP_LENGTH = 6;

  const emailFromQuery = useMemo(() => searchParams.get('email') ?? '', [searchParams]);

  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(emailFromQuery);
    if (emailFromQuery && typeof window !== 'undefined' && !sessionStorage.getItem('otp_toast_shown')) {
      toast.success('Verification code sent to your email!');
      sessionStorage.setItem('otp_toast_shown', 'true');
    }
  }, [emailFromQuery]);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();

    const cleanedOtp = otp.replace(/\D/g, '');
    if (!email) {
      toast.error('Email is required');
      return;
    }
    if (cleanedOtp.length !== OTP_LENGTH) {
      toast.error(`Please enter a valid ${OTP_LENGTH}-digit OTP`);
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Verifying OTP...');
    try {
      // 1. Verify OTP via our custom API
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: cleanedOtp }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      // 2. Auto-login using the password stored in sessionStorage during signup
      const pendingPassword = typeof window !== 'undefined' ? sessionStorage.getItem('pending_signup_password') : null;
      
      if (pendingPassword) {
        const loginResult = await signIn("credentials", {
          email,
          password: pendingPassword,
          redirect: false,
        });

        if (loginResult?.error) {
          toast.warning('Account verified, but auto-login failed. Please sign in manually.', { id: toastId });
          router.push('/login');
        } else {
          toast.success('Account verified and logged in!', { id: toastId });
          router.push('/');
        }
      } else {
        toast.success('Account verified! Please sign in.', { id: toastId });
        router.push('/login');
      }

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pending_signup_password');
        sessionStorage.removeItem('pending_signup_email');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Invalid OTP', { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) {
      toast.error('Email is required');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Resending OTP...');
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Unable to resend OTP');
      }

      toast.success('OTP resent to your email', { id: toastId });
    } catch (err: any) {
      toast.error(err.message ?? 'Unable to resend OTP', { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_35%),linear-gradient(135deg,#f8fafc,#eef6ff_45%,#fdf2f8)] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <BrandMark stacked className="items-center mb-4" subtitle="Email verification" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify OTP</h1>
          <p className="text-gray-600">Enter the {OTP_LENGTH}-digit code sent by Joules Events.</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">OTP</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={OTP_LENGTH}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 tracking-widest text-center text-lg"
              placeholder={"-".repeat(OTP_LENGTH)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
          >
            Resend OTP
          </button>

          <Link href="/signup" className="text-sm text-gray-600 hover:text-gray-800 font-medium">
            Back to Signup
          </Link>
        </div>
      </div>
    </div>
  );
}
