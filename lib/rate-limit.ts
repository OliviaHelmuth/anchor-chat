// In-memory fixed-window limiter. Correct for this project's actual
// scale (a single dev/demo instance) and explicitly not correct for a
// multi-instance deployment — it resets on redeploy and doesn't share
// state across serverless instances. A production version needs a shared
// store (Redis/Upstash) with a sliding window; see
// docs/challenges/passwordless-auth.md for the trade-off written out.
const hits = new Map<string, { count: number; windowStart: number }>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > limit;
}
