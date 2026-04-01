# Vercel Environment Variables Setup

Add these in Vercel under `Settings` -> `Environment Variables`.

## Core app / Supabase

```env
DATABASE_URL=postgresql://YOUR_SUPABASE_POOLER_CONNECTION
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=event-assets
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=event-assets
NEXT_PUBLIC_SITE_URL=https://YOUR_APP.vercel.app
```

## Payments

```env
NEXT_PUBLIC_PAYMENTS_ENABLED=true
RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_RAZORPAY_WEBHOOK_SECRET
QR_HMAC_SECRET=GENERATE_A_LONG_RANDOM_SECRET
```

## Optional email

```env
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
SMTP_FROM_EMAIL=...
FROM_EMAIL=...
```

## Deploy steps

1. Apply the Supabase SQL migrations.
2. Configure Supabase Auth email templates if you want OTP-style signup and recovery codes.
3. Save the Vercel env vars and redeploy.
4. Run `npm run uploads:migrate` locally once if you need to move existing repo uploads into Supabase Storage.

## Security

- Do not commit real secrets into repo docs.
- Rotate any Supabase, Razorpay, SMTP, or database credentials that were previously exposed.
