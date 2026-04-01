# QR Scanning E2E & Manual Test Plan

This document describes manual and automated (Cypress) steps to validate the QR scanning and check-in flow across devices.

Goals
- Confirm scanning is fast and accurate on iOS (Safari), Android (Chrome), and desktop cameras.
- Ensure camera selection works, permission fallbacks appear, and image upload works.
- Ensure signed tokens are validated and invalid/expired tokens are rejected.
- Ensure UI feedback (audio, preview modal, confirm) is correct and no wrong-person check-ins occur.

Prerequisites
- Ensure `QR_HMAC_SECRET` is set in environment for signed tokens tests.
- Build and deploy preview with the latest changes.

Manual test steps
1. Generate a ticket QR (open ticket page for a confirmed registration):
   - The QR should encode a signed token if `QR_HMAC_SECRET` is configured.
2. Admin flow (desktop):
   - Go to Admin → Attendance
   - Click "Scan QR" → allow camera
   - Confirm camera list shows at least one device
   - Present the ticket QR to the camera — verify the modal shows the preview and user details
   - Confirm check-in — verify attendance row and logs
3. Organizer flow (mobile):
   - Open Organizer → Attendance on mobile browser
   - Click "Scan QR" and switch to rear camera if available
   - Scan the QR — verify preview (name, email) and confirm
4. Fallback tests:
   - Upload an image containing the ticket QR and ensure preview works
   - Scan a random QR (not a registration) — verify preview returns "Registration not found" or similar and does not auto-checkin
5. Signed tokens:
   - Modify token (change one character) and scan — it should be rejected as invalid signature
   - Generate a token with a different `QR_HMAC_SECRET` (not the server secret) and verify reject
6. Race conditions / duplicates:
   - Scan the same QR twice quickly — the server should return "Already checked in" on second confirm

Automated (Cypress) stub
- If you use Cypress, add tests to simulate camera input via a pre-recorded video or a data URL image and verify the same UI flows.

Notes
- If tests fail on iOS/Safari, ensure camera permission is granted and the site is loaded via HTTPS.
- For massive events, consider offering a "one-tap check-in" mode (skip preview) only if organizers opt into it; server-side verification still applies.
