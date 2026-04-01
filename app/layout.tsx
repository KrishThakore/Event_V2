import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import PublicFooter from '@/components/PublicFooter';
import { Toaster } from 'sonner';
import { NextAuthProvider } from '../components/providers/NextAuthProvider';
import NextTopLoader from 'nextjs-toploader';
import { BRAND_NAME, BRAND_PLATFORM_LABEL, BRAND_TAGLINE } from '@/lib/brand';
import ErrorReporter from '@/components/ErrorReporter';

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: `${BRAND_PLATFORM_LABEL} | ${BRAND_TAGLINE}`,
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <NextTopLoader color="#9333ea" showSpinner={false} />
        <ErrorReporter />
        <NextAuthProvider>
          <Toaster position="top-center" richColors />
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
            <PublicFooter />
          </div>
        </NextAuthProvider>
      </body>
    </html>
  );
}
