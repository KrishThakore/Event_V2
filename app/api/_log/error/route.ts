import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type IncomingErrorPayload = {
  message?: unknown;
  stack?: unknown;
  digest?: unknown;
  href?: unknown;
  userAgent?: unknown;
  source?: unknown;
  extra?: unknown;
};

function asShortString(value: unknown, maxLen: number) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}…` : trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json({ ok: false, error: 'unsupported_content_type' }, { status: 415 });
    }

    const body = (await request.json()) as IncomingErrorPayload;

    const entry = {
      kind: 'client_error',
      at: new Date().toISOString(),
      vercelId: asShortString(request.headers.get('x-vercel-id'), 200),
      forwardedFor: asShortString(request.headers.get('x-forwarded-for'), 500),
      userAgent: asShortString((body.userAgent ?? request.headers.get('user-agent')) as unknown, 500),
      href: asShortString(body.href, 1000),
      source: asShortString(body.source, 100),
      digest: asShortString(body.digest, 200),
      message: asShortString(body.message, 2000),
      stack: asShortString(body.stack, 12000),
      extra: body.extra,
    };

    // Logs show up in Vercel "Functions" / "Runtime Logs".
    console.error('EMV2_ERROR', JSON.stringify(entry));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('EMV2_ERROR_LOGGING_FAILED', error);
    // Always return 200 to avoid creating additional noise/errors.
    return NextResponse.json({ ok: false });
  }
}

