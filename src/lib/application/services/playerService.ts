import { getRequiredReferer } from "../../config/embedServers";
import type { IContentProvider } from "../../domain/interfaces";
import type { VideoServer } from "../../domain/entities";
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
  ) {}

  async fetchEpisodeServers(
    slug: string,
    number: string,
    _force: boolean,
    signal?: AbortSignal
  ): Promise<FetchServersResult> {
    if (signal?.aborted === true) {
      return { servers: [], error: new Error("Request aborted") };
    }

    try {
      const data = await this.getProvider().getEpisodeServers(slug, number, { signal });
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
