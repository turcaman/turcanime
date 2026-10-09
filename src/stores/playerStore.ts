import { create } from "zustand";
import { source } from "../services/source";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/cache";
import { loadCached, resolveStreamCached } from "../utils/cache";
import { logger } from "../utils/logger";
import { SourceError } from "../utils/errors";
import { withAuthRetry } from "../utils/retry";
import {
  ResourceRunner,
  resourceInitialState,
  type LoadOutcome,
  type ResourceState,
} from "../utils/resource";
import type { AppError, StreamUrlResult, VideoServer } from "../types";

export const STREAM_KEY = "stream";

interface PlayerState {
  servers: ResourceState<VideoServer[]>;
  stream: ResourceState<StreamUrlResult>;
  lastLanguage: string | null;
  fetchServers: (slug: string, number: string, force?: boolean) => Promise<LoadOutcome<VideoServer[]>>;
  resolveStream: (server: VideoServer) => Promise<LoadOutcome<StreamUrlResult>>;
  /** Settles the stream from an orchestrator-level failure (e.g. servers fetch) */
  failStream: (error: AppError) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  const serversRunner = new ResourceRunner<VideoServer[]>({
    tag: "servers",
    get: () => get().servers,
    set: (servers) => set({ servers }),
  });
  const streamRunner = new ResourceRunner<StreamUrlResult>({
    tag: "stream",
    get: () => get().stream,
    set: (stream) => set({ stream }),
  });

  return {
    servers: resourceInitialState<VideoServer[]>(),
    stream: resourceInitialState<StreamUrlResult>(),
    lastLanguage: null,

    fetchServers: async (slug: string, number: string, force = false) => {
      const key = `${slug}_${number}`;
      const cacheKey = `${CACHE_PREFIXES.SERVERS}_${key}`;
      return serversRunner.load(key, (signal) =>
        withAuthRetry(
          (attempt) =>
            loadCached(cacheKey, (sig) => source.getEpisodeServers(slug, number, { signal: sig }), {
              ttl: CACHE_TTL.SERVERS,
              signal,
              force: attempt > 0 ? true : force,
            }),
          { signal, maxRetries: 2, tag: "servers" },
        ),
      );
    },

    resolveStream: async (server: VideoServer) => {
      set({ lastLanguage: server.language });
      return streamRunner.load(STREAM_KEY, (signal) =>
        withAuthRetry(
          async (attempt) => {
            const fresh = await resolveStreamCached(server, { force: attempt > 0 });
            if (fresh == null) throw new SourceError("No se pudo resolver el stream", "UNKNOWN");
            return fresh;
          },
          { signal, maxRetries: 2, tag: "stream" },
        ),
      );
    },

    failStream: (error: AppError) => {
      logger.warn("stream", `Stream failed upstream: ${error.type}: ${error.message}`);
      streamRunner.fail(STREAM_KEY, error);
    },

    reset: () => {
      serversRunner.reset();
      streamRunner.reset();
      set({ lastLanguage: null });
    },
  };
});