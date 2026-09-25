import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const HASH_PREFIX = "scrypt$";
const KEY_LEN = 64;

/**
 * Password hashing built on Node's scrypt (no external deps).
 * Format: `scrypt$<salt>$<key>` where salt and key are base64url.
 * Before this module existed passwords were stored in plaintext — see
 * verifyPassword for the lazy-migration flow that upgrades them on login.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const key = scryptSync(password, salt, KEY_LEN);
  return `${HASH_PREFIX}${salt}$${key.toString("base64url")}`;
}

/** True when the stored value is already a scrypt hash (not legacy plaintext). */
export function isHashedPassword(stored: string | null | undefined): boolean {
  return Boolean(stored && stored.startsWith(HASH_PREFIX));
}

/** Verifies a password against a scrypt hash. Returns false for legacy plaintext rows. */
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || !isHashedPassword(stored)) return false;
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [, salt, keyB64] = parts;
  let storedKey: Buffer;
  try {
    storedKey = Buffer.from(keyB64, "base64url");
  } catch {
    return false;
  }
  const expected = scryptSync(password, salt, KEY_LEN);
  if (storedKey.length !== expected.length) return false;
  return timingSafeEqual(storedKey, expected);
}

/** Passwords that must never be accepted (previously used as a universal bypass). */
export const WEAK_PASSWORDS = new Set(["admin123", "user123", "123456", "12345678", "password"]);

export function isWeakPassword(password: string): boolean {
  return WEAK_PASSWORDS.has(password.toLowerCase());
}