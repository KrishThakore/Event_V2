# Event-Management Website

This app is now structured for:

- `Next.js` on `Vercel`
- `Supabase Postgres` for application data
- `Supabase Auth` for sign-up, sign-in, OTP verification, and password recovery
- `Supabase Storage` for uploads and event assets

## Rollout checklist

1. Apply the SQL files in [supabase/migrations](/d:/Project/Event-Management/supabase/migrations).
2. Add the required Supabase and site env vars in Vercel.
3. Run `npm run uploads:migrate` once if you need to move existing `public/uploads` assets into Supabase Storage.

## Notes

- Legacy `/uploads/...` and `/api/uploads/...` paths are normalized to Supabase Storage public URLs.
- Existing `getServerSession` and `useSession` calls now resolve through a Supabase-backed compatibility layer instead of `next-auth`.
