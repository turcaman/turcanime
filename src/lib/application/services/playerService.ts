import { PLAYER_CACHE } from "../../config/cacheTTLs";
import { getRequiredReferer } from "../../config/embedServers";
import { getDeps } from "../../di";
import { VideoServer } from "../../domain/entities";
import { logger } from "../../utils/logger";

const cache = getDeps().cacheRepo;

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
  force: boolean,
  signal?: AbortSignal
): Promise<FetchServersResult> {
  const cKey = serverKey(slug, number);

  // Check cache first (skip if aborted)
  if (!force && !signal?.aborted) {
    const cached = await cache.get<VideoServer[]>(cKey);
    if (cached) {
      return { servers: cached, error: null };
    }
  }

  // Check abort after cache read
  if (signal?.aborted) {
    return { servers: [], error: new Error("Request aborted") };
  }

  // Fetch from provider
  try {
    const data = await getDeps().getProvider().getEpisodeServers(slug, number, { signal });
    await cache.set(cKey, data, PLAYER_CACHE.SERVERS);
    return { servers: data, error: null };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      return { servers: [], error: e };
    }
    logger.error("playerService", "fetchEpisodeServers failed", e);
    return { servers: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function resolveStreamUrl(server: VideoServer, episodeUrl?: string): Promise<ResolveStreamResult> {
  const cKey = streamKey(server.url);

  // Check cache first
  const cached = await cache.get<ResolvedStream>(cKey);
  if (cached) {
    logger.debug("playerService", `stream cache hit for ${server.url.slice(0, 40)}`);
    return { stream: cached, error: null, fromCache: true };
  }

  // Step 1: Extract iframe URL from bridge page via provider
  logger.debug("playerService", `resolving stream for ${server.url}`);
  try {
    const iframeUrl = await getDeps().getProvider().resolveStreamUrl(server.url);
    if (!iframeUrl) {
      return { stream: null, error: new Error("Failed to extract iframe URL"), fromCache: false };
    }
    logger.debug("playerService", `extracted iframe URL: ${iframeUrl}`);

    // Step 2: Navigate to embed page and extract HLS URL via WebView
    const hlsUrl = await getDeps().webViewBridge.resolveEmbedStreamUrl(iframeUrl);
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
