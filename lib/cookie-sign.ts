import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signs cookie values with an HMAC so clients can't forge session IDs (e.g.
 * setting finance_user_id=1 to impersonate the admin). When no secret is
 * configured the raw value is returned unchanged, preserving legacy behavior
 * during local development.
 */

function signingSecret(): string {
  return process.env.COOKIE_SIGNING_SECRET || "";
}

export function signValue(value: string): string {
  const secret = signingSecret();
  if (!secret) return value;
  const mac = createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${mac}`;
}

export function verifyValue(signed: string | undefined): string | null {
  if (!signed) return null;
  const secret = signingSecret();
  if (!secret) return signed;
  const dot = signed.lastIndexOf(".");
  if (dot <= 0) return null;
  const value = signed.slice(0, dot);
  const mac = signed.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(value).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? value : null;
}