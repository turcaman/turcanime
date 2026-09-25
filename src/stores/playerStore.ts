import { create } from "zustand";
import { source } from "../services/source";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/cache";
import { storage } from "../utils/storage";
import { getCachedStream, resolveStreamCached } from "../utils/cache";
import { logger } from "../utils/logger";
import { SessionRefreshError, withAuthRetry } from "../utils/retry";
import type { VideoServer } from "../types";

interface PlayerState {
  servers: VideoServer[];
  streamUrl: string | null;
  streamHeaders: Record<string, string> | null;
  lastLanguage: string | null;
  isLoading: boolean;
  error: string | null;
  fetchServers: (slug: string, number: string, force?: boolean, signal?: AbortSignal) => Promise<void>;
  resolveStream: (server: VideoServer) => Promise<void>;
  setStream: (url: string, headers: Record<string, string> | null) => void;
  setLastLanguage: (language: string) => void;
  reset: () => void;
}

const SERVERS_ERROR = "Error al cargar servidores";
const STREAM_ERROR = "Error al resolver stream";

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
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

    if (signal != null && signal.aborted) {
      set({ isLoading: false });
      return;
    }

    const cacheKey = `${CACHE_PREFIXES.SERVERS}_${slug}_${number}`;
    if (!force) {
      try {
        const cached = await storage.get<{ payload: VideoServer[]; expiration: number }>(cacheKey);
        if (cached && Date.now() < cached.expiration) {
          set({ servers: cached.payload, isLoading: false });
          return;
        }
      } catch {
      }
    }

    const fetchAndStore = async (): Promise<VideoServer[]> => {
      const data = await source.getEpisodeServers(slug, number, { signal });
      void storage.set(cacheKey, { payload: data, expiration: Date.now() + CACHE_TTL.SERVERS });
      return data;
    };

    try {
      const data = await withAuthRetry(fetchAndStore, { signal, tag: "playerStore" });
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
        error:
          e instanceof SessionRefreshError
            ? "Error de sesión al cargar servidores"
            : errorMessage(e, SERVERS_ERROR),
      });
    }
  },

  resolveStream: async (server: VideoServer) => {
    set({ isLoading: true, streamUrl: null, streamHeaders: null, lastLanguage: server.language, error: null });

    const applyStream = (url: string, headers?: Record<string, string>) => {
      set({ streamUrl: url, streamHeaders: headers ?? null, isLoading: false });
    };

    const cached = await getCachedStream(server);
    if (cached != null) {
      applyStream(cached.url, cached.headers);
      return;
    }

    try {
      const result = await withAuthRetry(async () => {
        const fresh = await resolveStreamCached(server);
        if (fresh == null) throw new Error("No se pudo resolver el stream");
        return fresh;
      }, { tag: "playerStore" });
      applyStream(result.url, result.headers);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        set({ isLoading: false });
        return;
      }
      set({
        isLoading: false,
        error:
          e instanceof SessionRefreshError
            ? "Error de sesión al resolver stream"
            : errorMessage(e, STREAM_ERROR),
      });
    }
  },

  setStream: (url, headers) => set({ streamUrl: url, streamHeaders: headers }),
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
}));
