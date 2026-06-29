import { ANIME_CACHE } from "../../config/cacheTTLs";
import { CACHE_PREFIXES } from "../../config/cacheKeys";
import { getRequiredReferer } from "../../config/embedServers";
import type { IContentProvider } from "../../domain/interfaces";
import { CacheRepo } from "../../domain/repositories/cacheRepo";
import type { VideoServer } from "../../domain/entities";
import { createCacheKey } from "../../utils/CacheUtils";
import { logger } from "../../utils/logger";

export interface ResolvedStream {
  url: string;
  headers?: Record<string, string>;
}

interface FetchServersResult {
  servers: VideoServer[];
  error: Error | null;
  errorType?: "AUTH_ERROR";
}

interface ResolveStreamResult {
  stream: ResolvedStream | null;
  error: Error | null;
  errorType?: "AUTH_ERROR";
}

export class PlayerService {
  constructor(
    private getProvider: () => IContentProvider,
    private cache: CacheRepo,
  ) {}

  async fetchEpisodeServers(
    slug: string,
    number: string,
    force: boolean,
    signal?: AbortSignal
  ): Promise<FetchServersResult> {
    if (signal?.aborted === true) {
      return { servers: [], error: new Error("Request aborted") };
    }

    if (!force) {
      const cacheKey = createCacheKey(CACHE_PREFIXES.SERVERS, `${slug}_${number}`);
      try {
        const cached = await this.cache.get<VideoServer[]>(cacheKey);
        if (cached && Date.now() < cached.expiration) {
          return { servers: cached.payload, error: null };
        }
      } catch {
      }
    }

    try {
      const data = await this.getProvider().getEpisodeServers(slug, number, { signal });
      const cacheKey = createCacheKey(CACHE_PREFIXES.SERVERS, `${slug}_${number}`);
      void this.cache.set(cacheKey, data, ANIME_CACHE.SERVERS);
      return { servers: data, error: null };
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        return { servers: [], error: e };
      }
      const isAuth = (e as Record<string, unknown> | null)?.type === "AUTH_ERROR";
      logger.error("playerService", "fetchEpisodeServers failed", e);
      return {
        servers: [],
        error: e instanceof Error ? e : new Error(String(e)),
        errorType: isAuth ? "AUTH_ERROR" : undefined,
      };
    }
  }

  async resolveStreamUrl(server: VideoServer, _episodeUrl?: string): Promise<ResolveStreamResult> {
    logger.debug("playerService", `resolving stream for ${server.url}`);

    const cacheKey = createCacheKey(CACHE_PREFIXES.STREAM, `${server.url}_${server.id}`);
    try {
      const cached = await this.cache.get<{ url: string; headers?: Record<string, string> }>(cacheKey);
      if (cached && Date.now() < cached.expiration) {
        return { stream: { url: cached.payload.url, headers: cached.payload.headers }, error: null };
      }
    } catch {
    }

    try {
      const streamResult = await this.getProvider().resolveStreamUrl(server.url);
      if (streamResult == null) {
        return { stream: null, error: new Error("Failed to resolve stream") };
      }

      let headers = streamResult.headers;
      if (!headers) {
        const referer = getRequiredReferer(streamResult.url);
        if (referer) headers = { Referer: referer };
      }

      void this.cache.set(cacheKey, { url: streamResult.url, headers }, ANIME_CACHE.STREAM);

      return {
        stream: { url: streamResult.url, headers },
        error: null,
      };
    } catch (e: unknown) {
      const isAuth = (e as Record<string, unknown> | null)?.type === "AUTH_ERROR";
      logger.error("playerService", "resolveStreamUrl failed", e);
      return {
        stream: null,
        error: e instanceof Error ? e : new Error(String(e)),
        errorType: isAuth ? "AUTH_ERROR" : undefined,
      };
    }
  }
}
