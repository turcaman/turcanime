import { CACHE_PREFIXES } from "../../config/cacheKeys";
import { PLAYER_CACHE } from "../../config/cacheTTLs";
import { getRequiredReferer } from "../../config/embedServers";
import { IContentProvider, IWebViewBridge } from "../../domain/interfaces";
import { VideoServer } from "../../domain/entities";
import { CacheRepo } from "../../domain/repositories/cacheRepo";
import { logger } from "../../utils/logger";
import { createCacheKey } from "../../utils/CacheUtils";

const serverKey = (slug: string, number: string) => `ep_${slug}_${number}`;
const streamKey = (url: string) => createCacheKey(CACHE_PREFIXES.STREAM, url);

export interface ResolvedStream {
  url: string;
  headers?: Record<string, string>;
}

interface FetchServersResult {
  servers: VideoServer[];
  error: Error | null;
}

interface ResolveStreamResult {
  stream: ResolvedStream | null;
  error: Error | null;
  fromCache: boolean;
}

export class PlayerService {
  constructor(
    private cache: CacheRepo,
    private getProvider: () => IContentProvider,
    private webViewBridge: IWebViewBridge,
  ) {}

  async fetchEpisodeServers(
    slug: string,
    number: string,
    force: boolean,
    signal?: AbortSignal
  ): Promise<FetchServersResult> {
    const cKey = serverKey(slug, number);

    if (!force && !signal?.aborted) {
      const cached = await this.cache.get<VideoServer[]>(cKey);
      if (cached) {
        return { servers: cached.payload, error: null };
      }
    }

    if (signal?.aborted) {
      return { servers: [], error: new Error("Request aborted") };
    }

    try {
      const data = await this.getProvider().getEpisodeServers(slug, number, { signal });
      await this.cache.set(cKey, data, PLAYER_CACHE.SERVERS);
      return { servers: data, error: null };
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        return { servers: [], error: e };
      }
      logger.error("playerService", "fetchEpisodeServers failed", e);
      return { servers: [], error: e instanceof Error ? e : new Error(String(e)) };
    }
  }

  async resolveStreamUrl(server: VideoServer, episodeUrl?: string): Promise<ResolveStreamResult> {
    const cKey = episodeUrl ? streamKey(episodeUrl) : streamKey(server.url);

    const cached = await this.cache.get<ResolvedStream>(cKey);
    if (cached) {
      logger.debug("playerService", `stream cache hit for ${server.url.slice(0, 40)}`);
      return { stream: cached.payload, error: null, fromCache: true };
    }

    logger.debug("playerService", `resolving stream for ${server.url}`);
    try {
      const iframeUrl = await this.getProvider().resolveStreamUrl(server.url);
      if (!iframeUrl) {
        return { stream: null, error: new Error("Failed to extract iframe URL"), fromCache: false };
      }
      logger.debug("playerService", `extracted iframe URL: ${iframeUrl}`);

      const hlsUrl = await this.webViewBridge.resolveEmbedStreamUrl(iframeUrl);
      if (!hlsUrl) {
        return { stream: null, error: new Error("Failed to resolve HLS stream"), fromCache: false };
      }
      logger.debug("playerService", `resolved HLS stream: OK`);

      const referer = getRequiredReferer(hlsUrl);
      const headers: Record<string, string> = {};
      if (referer) headers["Referer"] = referer;

      const resolved: ResolvedStream = {
        url: hlsUrl,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      };

      await this.cache.set(cKey, resolved, PLAYER_CACHE.STREAM_URL);
      return { stream: resolved, error: null, fromCache: false };
    } catch (e: unknown) {
      logger.error("playerService", "resolveStreamUrl failed", e);
      return {
        stream: null,
        error: e instanceof Error ? e : new Error(String(e)),
        fromCache: false,
      };
    }
  }
}
