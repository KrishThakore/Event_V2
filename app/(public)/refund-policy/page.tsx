import { Metadata } from 'next';

import { BRAND_NAME, BRAND_PLATFORM_LABEL, BRAND_SUPPORT_ADDRESS, BRAND_SUPPORT_EMAIL, BRAND_SUPPORT_PHONE } from '@/lib/brand';
import PublicNavbar from '../PublicNavbar';
import '../EventsDashboard.css';

export const metadata: Metadata = {
  title: `Refund Policy - ${BRAND_NAME}`,
  description: `Refund policy for purchases made through ${BRAND_PLATFORM_LABEL}`,
};

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">Refund Policy</h1>

          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">1. Event Purchases</h2>
              <p className="leading-relaxed text-gray-700">
                Unless an event listing states otherwise, registrations and ticket purchases made through {BRAND_PLATFORM_LABEL}
                are final and generally non-refundable.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">2. Organizer Changes</h2>
              <ul className="list-disc space-y-1 pl-6 text-gray-700">
                <li>If an event is rescheduled, your registration may remain valid for the updated date.</li>
                <li>If an event is cancelled, any refund handling will follow the organizer’s stated policy.</li>
                <li>Processing timelines depend on the payment method, gateway, and issuing bank.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">3. Non-Transferable Registrations</h2>
              <p className="leading-relaxed text-gray-700">
                Tickets and registrations are non-transferable unless the event page explicitly allows transfers.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">4. Contact Information</h2>
              <p className="text-gray-700">
                <strong>Email:</strong> {BRAND_SUPPORT_EMAIL}
                <br />
                <strong>Phone:</strong> {BRAND_SUPPORT_PHONE}
                <br />
                <strong>Operations:</strong> {BRAND_SUPPORT_ADDRESS}
              </p>
            </section>

            <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <h3 className="mb-2 text-lg font-semibold text-yellow-800">Important Notes</h3>
              <ul className="list-disc space-y-1 pl-6 text-sm text-yellow-800">
                <li>Review the event details carefully before confirming payment.</li>
                <li>Any exceptions or alternate refund terms should be listed on the event page itself.</li>
              </ul>
            </div>

            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                <strong>Last Updated:</strong> March 31, 2026
                <br />
                This policy applies to all registrations processed through our platform unless a listing states otherwise.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
