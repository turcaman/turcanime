import type { CacheEntry, StreamUrlResult } from "../types";
import { CACHE_PREFIXES, CACHE_TTL, LIMITS } from "../config/cache";
import { storage } from "./storage";
import { logger } from "./logger";
import { isAuthError, isCancelled, CancelledError, SourceError } from "./errors";
import { source } from "../services/source";

/**
 * Read-through cache with one contract: return the payload, or throw.
 * Cancellations always throw CancelledError so callers can never mistake an
 * aborted request for empty data. Cache read/write failures are internal and
 * never propagate — they only skip the cache layer.
 */
export async function loadCached<T>(
  cacheKey: string,
  fetchFn: (signal: AbortSignal) => Promise<T>,
  options: {
    ttl?: number;
    signal?: AbortSignal;
    force?: boolean;
    isValid?: (data: T) => boolean;
  } = {},
): Promise<T> {
  const { ttl, signal, force, isValid } = options;

  if (!force) {
    try {
      const cached = await storage.get<CacheEntry<T>>(cacheKey);
      if (cached && typeof cached.expiration === "number" && Date.now() < cached.expiration) {
        const isStale = cached.expiration - Date.now() < (ttl ?? 0) * 0.3;
        if (!isStale && (isValid == null || isValid(cached.payload))) {
          logger.debug("cache", `Hit "${cacheKey}"`);
          return cached.payload;
        }
        logger.debug("cache", isStale ? `Stale "${cacheKey}", refetching` : `Invalid hit "${cacheKey}", refetching`);
      } else {
        logger.debug("cache", `Miss "${cacheKey}", fetching`);
      }
    } catch {
      // Cache read failure only means no cached value available
    }
  } else {
    logger.debug("cache", `Force refresh for "${cacheKey}", skipping cache`);
  }

  let data: T;
  try {
    data = await fetchFn(signal ?? new AbortController().signal);
  } catch (e) {
    if (isCancelled(e)) throw new CancelledError();
    if (isAuthError(e)) {
      logger.debug("cache", `Auth error for "${cacheKey}", rethrowing to ladder`);
    }
    throw e;
  }

  // Fresh data failing validation is a real failure (empty parse, degraded
  // payload): throw instead of handing every caller a payload it must judge
  if (data != null && isValid != null && !isValid(data)) {
    logger.warn("cache", `Invalid fresh result for "${cacheKey}", failing`);
    throw new SourceError(`Invalid payload for ${cacheKey}`, "UNKNOWN");
  }

  try {
    if (data == null) {
      logger.debug("cache", `Null result for "${cacheKey}", skipping write`);
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
    // Cache write failure never invalidates the fetched data
  }

  return data;
}

// Shared resolved-stream cache used by resolveStreamCached
function streamCacheKey(server: { url: string; id: string }): string {
  return `${CACHE_PREFIXES.STREAM}_${server.url}_${server.id}`;
}

async function getCachedStream(server: { url: string; id: string }): Promise<StreamUrlResult | null> {
  const cached = await storage.get<CacheEntry<StreamUrlResult>>(streamCacheKey(server));
  if (cached != null && Date.now() < cached.expiration) return cached.payload;
  return null;
}

export function setCachedStream(server: { url: string; id: string }, result: StreamUrlResult): Promise<void> {
  return storage.set(streamCacheKey(server), { payload: result, expiration: Date.now() + CACHE_TTL.STREAM });
}

/**
 * Cache-aside stream resolution with a single owner. Returns null when the
 * bridge yields no stream.
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
