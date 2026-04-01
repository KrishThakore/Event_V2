import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'));
  res.cookies.getAll()
    .filter((cookie) => cookie.name.startsWith('sb-'))
    .forEach((cookie) => res.cookies.delete(cookie.name));
  return res;
}
