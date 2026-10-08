import type { CacheEntry, StreamUrlResult } from "../types";
import { CACHE_PREFIXES, CACHE_TTL, LIMITS } from "../config/cache";
import { storage } from "./storage";
import { logger } from "./logger";
import { isAuthError } from "./errors";
import { source } from "../services/source";

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
    isValid?: (data: T) => boolean;
  } = {},
): Promise<{ data: T | null; error: Error | null }> {
  const { ttl, signal, force, isValid } = options;

  if (!force) {
    try {
      const cached = await storage.get<CacheEntry<T>>(cacheKey);
      if (cached && typeof cached.expiration === "number" && Date.now() < cached.expiration) {
        const isStale = cached.expiration - Date.now() < (ttl ?? 0) * 0.3;
        if (!isStale) {
          if (isValid == null || isValid(cached.payload)) {
            logger.debug("cache", `Hit "${cacheKey}"`);
            return { data: cached.payload, error: null };
          }
          logger.debug("cache", `Invalid hit "${cacheKey}", refetching`);
        } else {
          logger.debug("cache", `Stale "${cacheKey}", refetching`);
        }
      } else {
        logger.debug("cache", `Miss "${cacheKey}", fetching`);
      }
    } catch {
    }
  } else {
    logger.debug("cache", `Force refresh for "${cacheKey}", skipping cache`);
  }

  try {
    const data = await fetchFn(signal ?? new AbortController().signal);

    try {
      if (data == null) {
        logger.debug("cache", `Null result for "${cacheKey}", skipping write`);
      } else if (isValid != null && !isValid(data)) {
        logger.debug("cache", `Invalid result for "${cacheKey}", skipping write`);
      } else {
        const entry: CacheEntry<T> = { payload: data, expiration: Date.now() + (ttl ?? 6 * 60 * 60 * 1000) };
        const size = JSON.stringify(data).length;
        if (size <= LIMITS.CACHE_MAX_ENTRY_SIZE) {
          await storage.set(cacheKey, entry);
        } else {
          logger.warn("cache", `Entry "${cacheKey}" too large (${(size / 1024).toFixed(1)}KB), skipping`);
        }
      }
    } catch {
    }

    return { data, error: null };
  } catch (e: unknown) {
    const err = e as { name?: string };
    if (err.name === "AbortError") {
      return { data: null, error: null };
    }
    // withAuthRetry detects auth failures only from thrown errors, so rethrow
    // them to trigger the session refresh; other errors stay as result.error.
    if (isAuthError(e)) {
      logger.debug("cache", `Auth error for "${cacheKey}", rethrowing to ladder`);
      throw e;
    }
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

// Shared resolved-stream cache used by both playerStore.resolveStream and useEpisodeNavigation
function streamCacheKey(server: { url: string; id: string }): string {
  return `${CACHE_PREFIXES.STREAM}_${server.url}_${server.id}`;
}

export async function getCachedStream(server: { url: string; id: string }): Promise<StreamUrlResult | null> {
  const cached = await storage.get<CacheEntry<StreamUrlResult>>(streamCacheKey(server));
  if (cached != null && Date.now() < cached.expiration) return cached.payload;
  return null;
}

export function setCachedStream(server: { url: string; id: string }, result: StreamUrlResult): Promise<void> {
  return storage.set(streamCacheKey(server), { payload: result, expiration: Date.now() + CACHE_TTL.STREAM });
}

/**
 * Cache-aside stream resolution with a single owner. Both playerStore.resolveStream
 * and useEpisodeNavigation used to reimplement this read→resolve→write sequence.
 * Returns null when the bridge yields no stream.
 */
export async function resolveStreamCached(
  server: { url: string; id: string },
  options: { force?: boolean } = {},
): Promise<StreamUrlResult | null> {
  if (!options.force) {
    const cached = await getCachedStream(server);
    if (cached != null) return cached;
  }
  const fresh = await source.resolveStreamUrl(server.url);
  if (fresh != null) void setCachedStream(server, fresh);
  return fresh;
}
