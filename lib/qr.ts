import crypto from 'crypto';

const SECRET = process.env.QR_HMAC_SECRET || '';

export function signPayload(payload: Record<string, any>) {
  if (!SECRET) {
    // If no secret provided, return JSON string (legacy fallback)
    return JSON.stringify(payload);
  }

  const json = JSON.stringify({ ...payload, iat: Date.now() });
  const b64 = Buffer.from(json).toString('base64url');
  const hmac = crypto.createHmac('sha256', SECRET).update(b64).digest('hex');
  return `${b64}.${hmac}`;
}

export function verifyToken(token: string, maxAgeMs = 1000 * 60 * 60 * 24 * 30) {
  if (!SECRET) return { valid: false, reason: 'No secret configured' };

  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'Invalid token format' };
  const [b64, sig] = parts;
  try {
    const expected = crypto.createHmac('sha256', SECRET).update(b64).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      return { valid: false, reason: 'Signature mismatch' };
    }

    const json = Buffer.from(b64, 'base64url').toString('utf-8');
    const obj = JSON.parse(json) as any;
    if (obj.iat && Date.now() - obj.iat > maxAgeMs) {
      return { valid: false, reason: 'Token expired' };
    }

    return { valid: true, payload: obj };
  } catch (err) {
    return { valid: false, reason: 'Invalid token content' };
  }
}
