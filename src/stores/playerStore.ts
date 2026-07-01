import { create } from "zustand";
import { source } from "../services/source";
import { refreshSession } from "../services/session";
import { refererForUrl } from "../config/source";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/cache";
import { storage } from "../utils/storage";
import { logger } from "../utils/logger";
import type { VideoServer } from "../types";

interface PlayerState {
  servers: VideoServer[];
  streamUrl: string | null;
  streamHeaders: Record<string, string> | null;
  lastLanguage: string | null;
  isLoading: boolean;
  error: string | null;
  fetchServers: (slug: string, number: string, force?: boolean, signal?: AbortSignal) => Promise<void>;
  resolveStream: (server: VideoServer, episodeUrl: string) => Promise<void>;
  setStream: (url: string, headers: Record<string, string> | null) => void;
  setLastLanguage: (language: string) => void;
  reset: () => void;
  clearError: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  servers: [],
  streamUrl: null,
  streamHeaders: null,
  lastLanguage: null,
  isLoading: false,
  error: null,

  fetchServers: async (slug: string, number: string, force = false, signal?: AbortSignal) => {
    set({ isLoading: true, servers: [], error: null });

    if (signal?.aborted === true) {
      set({ isLoading: false });
      return;
    }

    // Check cache
    const cacheKey = `${CACHE_PREFIXES.SERVERS}_${slug}_${number}`;
    if (!force) {
      try {
        const cached = await storage.get<{ payload: VideoServer[]; expiration: number }>(cacheKey);
        if (cached && Date.now() < cached.expiration) {
          set({ servers: cached.payload, isLoading: false });
          return;
        }
      } catch {
        // cache miss
      }
    }

    try {
      const data = await source.getEpisodeServers(slug, number, { signal });
      void storage.set(cacheKey, { payload: data, expiration: Date.now() + CACHE_TTL.SERVERS });
      set({ servers: data, isLoading: false });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        set({ isLoading: false });
        return;
      }
      logger.error("playerStore", "fetchServers failed", e);
      set({
        servers: [],
        isLoading: false,
        error: e instanceof Error ? e.message : "Error al cargar servidores",
      });
    }
  },

  resolveStream: async (server: VideoServer, _episodeUrl: string) => {
    set({ isLoading: true, streamUrl: null, streamHeaders: null, lastLanguage: server.language, error: null });

    const cacheKey = `${CACHE_PREFIXES.STREAM}_${server.url}_${server.id}`;

    // Check cache
    try {
      const cached = await storage.get<{ payload: { url: string; headers?: Record<string, string> }; expiration: number }>(cacheKey);
      if (cached && Date.now() < cached.expiration) {
        set({
          streamUrl: cached.payload.url,
          streamHeaders: cached.payload.headers ?? null,
          isLoading: false,
        });
        return;
      }
    } catch {
      // cache miss
    }

    const doResolve = async (): Promise<boolean> => {
      const streamResult = await source.resolveStreamUrl(server.url);
      if (streamResult == null) return false;

      let headers = streamResult.headers;
      if (!headers) {
        const referer = refererForUrl(streamResult.url);
        if (referer) headers = { Referer: referer };
      }

      void storage.set(cacheKey, {
        payload: { url: streamResult.url, headers },
        expiration: Date.now() + CACHE_TTL.STREAM,
      });

      set({
        streamUrl: streamResult.url,
        streamHeaders: headers ?? null,
        isLoading: false,
      });
      return true;
    };

    try {
      const ok = await doResolve();
      if (ok) return;

      // Retry with fresh session
      logger.info("playerStore", "Stream resolve failed, refreshing session...");
      await refreshSession();
      const ok2 = await doResolve();
      if (!ok2) {
        set({ isLoading: false, error: "No se pudo resolver el stream" });
      }
    } catch (e: unknown) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : "Error al resolver stream",
      });
    }
  },

  setStream: (url, headers) => set({ streamUrl: url, streamHeaders: headers, error: null }),
  setLastLanguage: (language) => set({ lastLanguage: language }),
  reset: () =>
    set({
      servers: [],
      streamUrl: null,
      streamHeaders: null,
      lastLanguage: null,
      isLoading: false,
      error: null,
    }),
  clearError: () => set({ error: null }),
}));
