type ClientErrorPayload = {
  message?: string;
  stack?: string;
  digest?: string;
  href?: string;
  userAgent?: string;
  source?: string;
  extra?: unknown;
};

export function reportClientError(payload: ClientErrorPayload) {
  try {
    const body: ClientErrorPayload = {
      ...payload,
      href: payload.href ?? (typeof location !== 'undefined' ? location.href : undefined),
      userAgent: payload.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
    };

    const json = JSON.stringify(body);

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([json], { type: 'application/json' });
      navigator.sendBeacon('/api/_log/error', blob);
      return;
    }

    // Fallback: fire-and-forget fetch
    void fetch('/api/_log/error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never throw from error reporting
  }
}

