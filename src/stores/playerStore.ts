import { create } from "zustand";
import { source } from "../services/source";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/cache";
import { loadCached, resolveStreamCached, invalidateCachedStream } from "../utils/cache";
import { storage } from "../utils/storage";
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

  // Derived playback artifacts behind the episode in flight. Any playback
  // failure drops them: servers are only as fresh as the bridge URLs they
  // carry, so the next attempt regenerates the whole chain instead of
  // replaying a dead one
  let lastServersKey: string | null = null;
  let lastStreamServer: { url: string; id: string } | null = null;

  const dropPlaybackArtifacts = (): void => {
    if (lastStreamServer != null) void invalidateCachedStream(lastStreamServer);
    if (lastServersKey != null) void storage.remove(lastServersKey);
    lastStreamServer = null;
    lastServersKey = null;
  };

  return {
    servers: resourceInitialState<VideoServer[]>(),
    stream: resourceInitialState<StreamUrlResult>(),
    lastLanguage: null,

    fetchServers: async (slug: string, number: string, force = false) => {
      const key = `${slug}_${number}`;
      const cacheKey = `${CACHE_PREFIXES.SERVERS}_${key}`;
      lastServersKey = cacheKey;
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
      lastStreamServer = server;
      const outcome = await streamRunner.load(STREAM_KEY, (signal) =>
        withAuthRetry(
          async (attempt) => {
            const fresh = await resolveStreamCached(server, { force: attempt > 0 });
            if (fresh == null) throw new SourceError("No se pudo resolver el stream", "VIDEO_ERROR");
            return fresh;
          },
          { signal, maxRetries: 2, tag: "stream" },
        ),
      );
      if (outcome.status === "error") dropPlaybackArtifacts();
      return outcome;
    },

    failStream: (error: AppError) => {
      logger.warn("stream", `Stream failed upstream: ${error.type}: ${error.message}`);
      dropPlaybackArtifacts();
      streamRunner.fail(STREAM_KEY, error);
    },

    reset: () => {
      serversRunner.reset();
      streamRunner.reset();
      lastServersKey = null;
      lastStreamServer = null;
      set({ lastLanguage: null });
    },
  };
});