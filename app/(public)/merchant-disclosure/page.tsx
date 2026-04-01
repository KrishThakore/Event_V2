import { Metadata } from 'next';

import {
  BRAND_LEGAL_NAME,
  BRAND_NAME,
  BRAND_PAYMENT_PROVIDER,
  BRAND_PLATFORM_LABEL,
  BRAND_SUPPORT_ADDRESS,
  BRAND_SUPPORT_EMAIL,
  BRAND_SUPPORT_PHONE,
} from '@/lib/brand';
import PublicNavbar from '../PublicNavbar';
import '../EventsDashboard.css';

export const metadata: Metadata = {
  title: `Merchant Disclosure - ${BRAND_NAME}`,
  description: `Merchant and payment disclosure for ${BRAND_PLATFORM_LABEL}`,
};

export default function MerchantDisclosurePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">Merchant Disclosure</h1>

          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Business Information</h2>
              <div className="space-y-3 rounded-lg bg-gray-50 p-6">
                <p><strong>Merchant Name:</strong> {BRAND_LEGAL_NAME}</p>
                <p><strong>Business Type:</strong> Event technology and registration platform</p>
                <p><strong>Service Category:</strong> Event registration, ticketing, and organizer operations</p>
                <p><strong>Coverage:</strong> {BRAND_SUPPORT_ADDRESS}</p>
                <p><strong>Phone:</strong> {BRAND_SUPPORT_PHONE}</p>
                <p><strong>Email:</strong> {BRAND_SUPPORT_EMAIL}</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Payment Processing</h2>
              <div className="space-y-3 rounded-lg bg-blue-50 p-6">
                <p><strong>Payment Gateway:</strong> {BRAND_PAYMENT_PROVIDER}</p>
                <p><strong>Security:</strong> Checkout is processed through PCI DSS-aligned payment infrastructure</p>
                <p><strong>Currency:</strong> As displayed on the checkout experience for each registration</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Service Terms</h2>
              <div className="space-y-3 rounded-lg bg-yellow-50 p-6">
                <p><strong>Service Scope:</strong> Digital event registration and ticketing services</p>
                <p><strong>Refund Policy:</strong> As stated on the event listing and our published refund policy</p>
                <p><strong>Dispute Resolution:</strong> Support requests are reviewed through our standard help and payment review process</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Support Contacts</h2>
              <div className="space-y-3 rounded-lg bg-gray-50 p-6">
                <p><strong>General Support:</strong> {BRAND_SUPPORT_EMAIL}</p>
                <p><strong>Payment Support:</strong> {BRAND_SUPPORT_PHONE}</p>
                <p><strong>Operations:</strong> {BRAND_SUPPORT_ADDRESS}</p>
              </div>
            </section>

            <div className="mt-8 border-t pt-6">
              <p className="text-sm text-gray-500">
                <strong>Last Updated:</strong> March 31, 2026
                <br />
                This disclosure is provided to support transparency around payments and merchant operations.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
