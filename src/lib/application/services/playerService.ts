import { PLAYER_CACHE } from "../../config/cacheTTLs";
import { getRequiredReferer } from "../../config/embedServers";
import { getDeps } from "../../di";
import { VideoServer } from "../../domain/entities";
import { CacheRepo } from "../../domain/repositories/cacheRepo";
import { logger } from "../../utils/logger";

const cache = CacheRepo.getInstance(getDeps().storage);

const serverKey = (slug: string, number: string) => `ep_${slug}_${number}`;
const streamKey = (url: string) => `stream_${url}`;

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

export async function fetchEpisodeServers(
  slug: string,
  number: string,
  force: boolean
): Promise<FetchServersResult> {
  const cKey = serverKey(slug, number);

  // Check cache first
  if (!force) {
    const cached = await cache.get<VideoServer[]>(cKey);
    if (cached) {
      return { servers: cached, error: null };
    }
  }

  // Fetch from provider
  try {
    const data = await getDeps().getProvider().getEpisodeServers(slug, number);
    await cache.set(cKey, data, PLAYER_CACHE.SERVERS);
    return { servers: data, error: null };
  } catch (e: unknown) {
    logger.error("playerService", "fetchEpisodeServers failed", e);
    return { servers: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function resolveStreamUrl(server: VideoServer): Promise<ResolveStreamResult> {
  const cKey = streamKey(server.url);

  // Check cache first
  const cached = await cache.get<ResolvedStream>(cKey);
  if (cached) {
    logger.debug("playerService", `stream cache hit for ${server.url.slice(0, 40)}`);
    return { stream: cached, error: null, fromCache: true };
  }

  // Resolve via WebView
  logger.debug("playerService", `resolving stream for ${server.url}`);
  try {
    const result = await getDeps().webViewBridge.resolveStreamUrl(server.url);
    logger.debug("playerService", `resolved stream: ${result ? "OK" : "null"}`);

    if (!result) {
      return { stream: null, error: new Error("Failed to resolve stream"), fromCache: false };
    }

    const referer = getRequiredReferer(result);
    const headers: Record<string, string> = {};
    if (referer) headers["Referer"] = referer;

    const resolved: ResolvedStream = {
      url: result,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    };

    await cache.set(cKey, resolved, PLAYER_CACHE.STREAM_URL);
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

export async function clearPlayerCache(): Promise<void> {
  await Promise.all([
    cache.clearWithPrefix("ep_"),
    cache.clearWithPrefix("stream_"),
  ]);
}

export async function clearAllCache(): Promise<void> {
  await cache.clearAll(["scraper_session"]);
}
