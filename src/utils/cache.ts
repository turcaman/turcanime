import type { CacheEntry } from "../types";
import { LIMITS } from "../config/cache";
import { storage } from "./storage";
import { logger } from "./logger";

/**
 * Fetch data with caching.
 * Returns cached value if available and not expired (with 30% stale threshold).
 * If force is true, skips cache and fetches fresh data.
 */
export async function withCache<T>(
  cacheKey: string,
  fetchFn: (signal: AbortSignal) => Promise<T>,
  options: {
    ttl?: number;
    signal?: AbortSignal;
    force?: boolean;
  } = {},
): Promise<{ data: T | null; error: Error | null; fromCache: boolean }> {
  const { ttl, signal, force } = options;

  // Try cache first
  if (!force) {
    try {
      const cached = await storage.get<CacheEntry<T>>(cacheKey);
      if (cached && typeof cached.expiration === "number" && Date.now() < cached.expiration) {
        const isStale = cached.expiration - Date.now() < (ttl ?? 0) * 0.3;
        if (!isStale) {
          return { data: cached.payload, error: null, fromCache: true };
        }
      }
    } catch {
      // cache miss or corrupted
    }
  }

  try {
    const data = await fetchFn(signal ?? new AbortController().signal);

    // Cache the result (skip if too large)
    try {
      const entry: CacheEntry<T> = { payload: data, expiration: Date.now() + (ttl ?? 6 * 60 * 60 * 1000) };
      const size = JSON.stringify(data).length;
      if (size <= LIMITS.CACHE_MAX_ENTRY_SIZE) {
        await storage.set(cacheKey, entry);
      } else {
        logger.warn("Cache", `Entry "${cacheKey}" too large (${(size / 1024).toFixed(1)}KB), skipping`);
      }
    } catch {
      // non-critical
    }

    return { data, error: null, fromCache: false };
  } catch (e: unknown) {
    const err = e as { name?: string };
    if (err.name === "AbortError") {
      return { data: null, error: null, fromCache: false };
    }
    return { data: null, error: e instanceof Error ? e : new Error(String(e)), fromCache: false };
  }
}
