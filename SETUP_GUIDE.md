# Project Setup & Migration Guide

This setup now assumes a `Vercel + Supabase` deployment model instead of local PostgreSQL file storage.

## 1. Prerequisites

- `Node.js` v18 or higher
- A `Supabase` project with Auth, Postgres, and Storage enabled
- A `Vercel` project connected to this repo

## 2. Code Setup

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` and add:

```env
DATABASE_URL=postgresql://YOUR_SUPABASE_POOLER_CONNECTION
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=event-assets
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=event-assets
NEXT_PUBLIC_SITE_URL=http://localhost:1666
```

Add Razorpay and SMTP variables only if you use those features.

## 3. Database / Auth Setup

Apply the SQL migrations in [supabase/migrations](/d:/Project/Event-Management/supabase/migrations).

The required migration for the auth move is:

- `20260331090000_supabase_auth_profile_sync.sql`

This keeps `auth.users` and `public.profiles` aligned for the app's role-based queries.

If you already have files in `public/uploads`, migrate them to Supabase Storage once:

```bash
npm run uploads:migrate
```

## 4. Finalize & Start

Generate Prisma and run the app:

```bash
npx prisma generate
npm run dev
```

The app will run at `http://localhost:1666`.

## Security Reminder

- Never commit `.env.local` or raw database dumps.
- Rotate any previously exposed credentials before deploying to Vercel.
