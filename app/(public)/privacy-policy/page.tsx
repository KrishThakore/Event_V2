import { Metadata } from 'next';

import {
  BRAND_NAME,
  BRAND_PLATFORM_LABEL,
  BRAND_SUPPORT_ADDRESS,
  BRAND_SUPPORT_EMAIL,
  BRAND_SUPPORT_PHONE,
} from '@/lib/brand';
import PublicNavbar from '../PublicNavbar';
import '../EventsDashboard.css';

export const metadata: Metadata = {
  title: `Privacy Policy - ${BRAND_NAME}`,
  description: `Privacy policy for ${BRAND_PLATFORM_LABEL}`,
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">Privacy Policy</h1>

          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">1. Introduction</h2>
              <p className="leading-relaxed text-gray-700">
                {BRAND_NAME} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy.
                This policy explains how we collect, use, disclose, and safeguard your information when you use
                {` ${BRAND_PLATFORM_LABEL}.`}
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">2. Information We Collect</h2>
              <ul className="list-disc space-y-1 pl-6 text-gray-700">
                <li>Name and contact information, including email and phone number</li>
                <li>Profile details, registration responses, and event participation data</li>
                <li>Payment confirmation details provided by our payment partners</li>
                <li>Technical usage information such as IP address, browser, device, and access logs</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">3. How We Use Information</h2>
              <ul className="list-disc space-y-1 pl-6 text-gray-700">
                <li>To manage registrations, tickets, attendance, and event communication</li>
                <li>To process payments and support refund or verification workflows</li>
                <li>To improve platform security, reliability, and user experience</li>
                <li>To comply with legal obligations and prevent fraud or abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">4. Payment Information</h2>
              <p className="leading-relaxed text-gray-700">
                Payment processing is handled by Razorpay and any other payment service explicitly shown at checkout.
                We do not store full payment card data on our own servers. We only receive the transaction details
                needed to validate registrations, support users, and maintain records.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">5. Information Sharing</h2>
              <ul className="list-disc space-y-1 pl-6 text-gray-700">
                <li>With organizers and event operators when needed to fulfill a registration</li>
                <li>With payment, infrastructure, email, and storage providers acting on our behalf</li>
                <li>When required by law, regulation, court order, or to protect our rights and users</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">6. Retention and Security</h2>
              <p className="leading-relaxed text-gray-700">
                We retain information only for as long as needed for the purposes described in this policy, including
                legal, accounting, tax, security, and dispute-resolution needs. We use reasonable administrative,
                technical, and organizational measures to protect your information.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">7. Your Rights</h2>
              <ul className="list-disc space-y-1 pl-6 text-gray-700">
                <li>Request access to the personal information we hold about you</li>
                <li>Request correction or deletion where legally permitted</li>
                <li>Object to or restrict certain processing in applicable cases</li>
                <li>Withdraw consent for future processing where consent is the legal basis</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">8. Contact Information</h2>
              <div className="space-y-2 text-gray-700">
                <p>If you have privacy questions or want to exercise your rights, contact us:</p>
                <p>
                  <strong>Email:</strong> {BRAND_SUPPORT_EMAIL}
                  <br />
                  <strong>Phone:</strong> {BRAND_SUPPORT_PHONE}
                  <br />
                  <strong>Operations:</strong> {BRAND_SUPPORT_ADDRESS}
                </p>
              </div>
            </section>

            <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                <strong>Last Updated:</strong> March 31, 2026
                <br />
                This Privacy Policy remains in effect until a revised version is published.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
