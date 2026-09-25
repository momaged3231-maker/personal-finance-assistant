import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signs cookie values with an HMAC so clients can't forge session IDs (e.g.
 * setting finance_user_id=1 to impersonate the admin). A COOKIE_SIGNING_SECRET
 * is MANDATORY: without it we refuse to sign (fail closed) instead of silently
 * accepting raw values.
 */

function signingSecret(): string {
  return process.env.COOKIE_SIGNING_SECRET || "";
}

export function signValue(value: string): string {
  const secret = signingSecret();
  if (!secret) throw new Error("COOKIE_SIGNING_SECRET is not configured — refusing to sign cookies");
  const mac = createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${mac}`;
}

export function verifyValue(signed: string | undefined): string | null {
  if (!signed) return null;
  const secret = signingSecret();
  if (!secret) return null;
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