import { NextRequest } from 'next/server';

function normalizeOrigin(value: string) {
  return value.replace(/\/$/, '');
}

function isLoopbackHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function getForwardedOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();

  if (!forwardedHost) {
    return null;
  }

  const forwardedProto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    request.nextUrl.protocol.replace(/:$/, '') ||
    'https';

  return normalizeOrigin(`${forwardedProto}://${forwardedHost}`);
}

function parseOriginCandidate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    return normalizeOrigin(url.origin);
  } catch {
    return null;
  }
}

function getOriginFromReferer(request: NextRequest) {
  return parseOriginCandidate(request.headers.get('referer'));
}

export function getCanonicalOrigin(request: NextRequest, preferredOrigin?: string | null) {
  const preferred = parseOriginCandidate(preferredOrigin);
  if (preferred) {
    return preferred;
  }

  const explicitOrigin =
    process.env.BACKUP_OAUTH_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL;

  const normalizedExplicitOrigin = parseOriginCandidate(explicitOrigin);
  if (normalizedExplicitOrigin) {
    const explicitHostname = new URL(normalizedExplicitOrigin).hostname;

    if (!isLoopbackHost(explicitHostname)) {
      return normalizedExplicitOrigin;
    }
  }

  const refererOrigin = getOriginFromReferer(request);
  if (refererOrigin) {
    return refererOrigin;
  }

  const forwardedOrigin = getForwardedOrigin(request);
  if (forwardedOrigin) {
    return forwardedOrigin;
  }

  if (normalizedExplicitOrigin) {
    return normalizedExplicitOrigin;
  }

  return normalizeOrigin(request.nextUrl.origin);
}
