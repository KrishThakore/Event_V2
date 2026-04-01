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
  title: `Terms of Service - ${BRAND_NAME}`,
  description: `Terms and conditions for using ${BRAND_PLATFORM_LABEL}`,
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">Terms of Service</h1>

          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
              <p className="leading-relaxed text-gray-700">
                By accessing or using {BRAND_PLATFORM_LABEL}, you agree to these Terms of Service. If you do not agree,
                please do not use the platform.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">2. Registrations and Payments</h2>
              <ul className="list-disc space-y-1 pl-6 text-gray-700">
                <li>Registrations are subject to event availability and organizer approval where applicable.</li>
                <li>Paid registrations are processed in the currency shown at checkout.</li>
                <li>Payment processing may be handled by Razorpay or another checkout partner displayed to you.</li>
                <li>You are responsible for providing accurate details during registration and payment.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">3. Event Changes and User Conduct</h2>
              <ul className="list-disc space-y-1 pl-6 text-gray-700">
                <li>Events may be modified, rescheduled, or cancelled by organizers when necessary.</li>
                <li>Participants must follow venue rules, organizer instructions, and applicable laws.</li>
                <li>We may suspend or revoke access for misuse, fraud, abuse, or policy violations.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">4. Privacy and Data</h2>
              <p className="leading-relaxed text-gray-700">
                Your use of the platform is also governed by our Privacy Policy. By using the service, you agree to the
                collection and processing of information necessary to operate registrations, payments, communication,
                security, and support.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">5. Intellectual Property</h2>
              <p className="leading-relaxed text-gray-700">
                The platform, its software, branding, and related materials belong to {BRAND_NAME} or its licensors and
                are protected by applicable intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">6. Limitation of Liability</h2>
              <p className="leading-relaxed text-gray-700">
                To the maximum extent permitted by law, {BRAND_NAME} is not liable for indirect, incidental, special,
                consequential, or punitive damages arising from your use of the platform or participation in events.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">7. Contact Information</h2>
              <p className="text-gray-700">
                <strong>Email:</strong> {BRAND_SUPPORT_EMAIL}
                <br />
                <strong>Phone:</strong> {BRAND_SUPPORT_PHONE}
                <br />
                <strong>Operations:</strong> {BRAND_SUPPORT_ADDRESS}
              </p>
            </section>

            <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                <strong>Last Updated:</strong> March 31, 2026
                <br />
                Continued use of the platform after updates means you accept the revised terms.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
