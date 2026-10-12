import { TIMEOUTS } from "../config/cache";

export function calcProgress(progress?: number | null, duration?: number | null): number {
  if (progress != null && duration != null && duration > 0) {
    return Math.min(progress / duration, 1);
  }
  return 0;
}

// Full-jitter exponential backoff (AWS-style): random within [floor, min(max, base * 2^attempt))
// Floor keeps ladder retries off a closed gate on slow networks instead of hammering it instantly
export function backoffDelay(attempt: number): number {
  const cap = Math.min(TIMEOUTS.RETRY_MAX_DELAY, TIMEOUTS.RETRY_BASE_DELAY * 2 ** attempt);
  const floor = Math.min(cap, 500);
  return floor + Math.floor(Math.random() * (cap - floor + 1));
}
