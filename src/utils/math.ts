import { TIMEOUTS } from "../config/cache";

export function calcProgress(progress?: number | null, duration?: number | null): number {
  if (progress != null && duration != null && duration > 0) {
    return Math.min(progress / duration, 1);
  }
  return 0;
}

// Full-jitter exponential backoff (AWS-style): random within [0, min(max, base * 2^attempt))
export function backoffDelay(attempt: number): number {
  const cap = Math.min(TIMEOUTS.RETRY_MAX_DELAY, TIMEOUTS.RETRY_BASE_DELAY * 2 ** attempt);
  return Math.floor(Math.random() * cap);
}
