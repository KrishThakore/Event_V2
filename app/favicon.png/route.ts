import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/favicon-32x32.png', request.url));
}

