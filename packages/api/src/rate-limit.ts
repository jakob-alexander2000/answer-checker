export type LimitDecision = { ok: boolean; hits: number[] };

/** Sliding window: keep the stamps inside the window, allow if fewer than max. */
export function allow(now: number, hits: readonly number[], windowMs: number, max: number): LimitDecision {
  const kept = hits.filter((stamp) => now - stamp < windowMs);
  if (kept.length >= max) return { ok: false, hits: kept };
  kept.push(now);
  return { ok: true, hits: kept };
}

/** In-memory limiter per key. Fine for one process; put a shared store in front for more. */
export function createLimiter(max: number, windowMs = 60_000) {
  const buckets = new Map<string, number[]>();
  return {
    allow(key: string, now = Date.now()): boolean {
      const decision = allow(now, buckets.get(key) ?? [], windowMs, max);
      if (decision.hits.length === 0) buckets.delete(key);
      else buckets.set(key, decision.hits);
      return decision.ok;
    },
  };
}
