'use client';

import Link from 'next/link';
import { CreditCard, Mail, MapPin, Shield } from 'lucide-react';
import BrandMark from './BrandMark';
import { BRAND_LOCATION, BRAND_NAME, BRAND_SUPPORT_EMAIL, BRAND_TAGLINE } from '@/lib/brand';

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-sky-100 bg-gradient-to-b from-white to-sky-50/50">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-4 md:gap-8">
          <div className="col-span-1 space-y-8 md:col-span-2">
            <Link href="/" className="group inline-flex items-center gap-4">
              <BrandMark subtitle="Event platform" />
            </Link>

            <p className="max-w-sm text-sm font-semibold leading-relaxed text-slate-600">
              {BRAND_TAGLINE}. Secure payments, polished ticketing, and flexible workflows for every host.
            </p>

            <div className="space-y-4 border-t border-sky-100/70 pt-4">
              <div className="group flex items-center gap-4 text-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 transition-all duration-500 group-hover:bg-sky-700 group-hover:text-white">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="mb-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Coverage</span>
                  <span className="font-bold text-slate-900">{BRAND_LOCATION}</span>
                </div>
              </div>

              <div className="group flex items-center gap-4 text-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 transition-all duration-500 group-hover:bg-sky-700 group-hover:text-white">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="mb-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Email Support</span>
                  <span className="font-bold text-slate-900">{BRAND_SUPPORT_EMAIL}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1 grid grid-cols-2 gap-8 md:col-span-2">
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Navigation</h4>
              <ul className="space-y-3">
                {[
                  { name: 'Home', href: '/' },
                  { name: 'Browse Events', href: '/events' },
                  { name: 'My Dashboard', href: '/dashboard' },
                  { name: 'Organizer Portal', href: '/login' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group/link flex items-center gap-2 text-sm font-bold text-slate-500 transition-all duration-300 hover:text-sky-700"
                    >
                      <div className="h-px w-1.5 origin-left scale-x-0 bg-sky-700 transition-transform group-hover/link:scale-x-100" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Legal & Privacy</h4>
              <ul className="space-y-3">
                {[
                  { name: 'Terms of Service', href: '/terms-of-service' },
                  { name: 'Privacy Policy', href: '/privacy-policy' },
                  { name: 'Refund Policy', href: '/refund-policy' },
                  { name: 'Merchant Disclosure', href: '/merchant-disclosure' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group/link flex items-center gap-2 text-sm font-bold text-slate-500 transition-all duration-300 hover:text-sky-700"
                    >
                      <div className="h-px w-1.5 origin-left scale-x-0 bg-sky-700 transition-transform group-hover/link:scale-x-100" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-20 border-t border-sky-100/70 pt-10">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 rounded-2xl border border-sky-50 bg-white px-5 py-2.5 shadow-sm transition-colors hover:border-sky-200">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payments</span>
                  <span className="text-xs font-black text-slate-900">Razorpay Secure</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-sky-50 bg-white px-5 py-2.5 shadow-sm transition-colors hover:border-sky-200">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Standard</span>
                  <span className="text-xs font-black text-slate-900">PCI DSS Certified</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 md:items-end">
              <div className="text-sm font-black tracking-tight text-slate-400">
                © {currentYear} <span className="text-slate-900">{BRAND_NAME}.</span>
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                All rights reserved. Built for ambitious campus and creator communities.
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-[2rem] border border-sky-100/50 bg-sky-50/30 px-8 py-4">
            <p className="text-center text-[10px] font-bold uppercase tracking-widest leading-relaxed text-slate-500">
              Payments processed via Razorpay Services Pvt Ltd. Terms of service and privacy policies apply.
              No payment card data is stored on Joules Events servers.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
