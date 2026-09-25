type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

/**
 * Minimal in-memory sliding-window rate limiter.
 * NOTE: per-instance only — enough to blunt abusive bursts on a single
 * serverless instance; not a global quota across all instances.
 */
export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  current.count += 1;
  if (current.count > max) {
    // Best-effort sweep to keep the map bounded on long-lived processes.
    if (store.size > 2500) {
      for (const [k, bucket] of store) {
        if (bucket.resetAt <= now) store.delete(k);
      }
    }
    return true;
  }
  return false;
}