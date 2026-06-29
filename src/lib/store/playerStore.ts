import { create } from "zustand";
import { getDeps } from "../di";
import type { VideoServer } from "../domain/entities";
import { ANIME_CACHE } from "../config/cacheTTLs";
import { CACHE_PREFIXES } from "../config/cacheKeys";
import { createCacheKey } from "../utils/CacheUtils";

interface PlayerState {
  servers: VideoServer[];
  streamUrl: string | null;
  streamHeaders: Record<string, string> | null;
  lastLanguage: string | null;
  isLoading: boolean;
  error: string | null;

  fetchServers: (
    slug: string,
    number: string,
    force?: boolean,
    signal?: AbortSignal,
  ) => Promise<void>;
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
    if (!force) {
      const cacheKey = createCacheKey(CACHE_PREFIXES.SERVERS, `${slug}_${number}`);
      try {
        const cached = await getDeps().cacheRepo.get<VideoServer[]>(cacheKey);
        if (cached && Date.now() < cached.expiration) {
          set({ servers: cached.payload, isLoading: false, error: null });
          return;
        }
      } catch {
      }
    }
    set({ isLoading: true, servers: [], error: null });
    const result = await getDeps().playerService.fetchEpisodeServers(slug, number, force, signal);
    if (result.servers.length > 0) {
      const cacheKey = createCacheKey(CACHE_PREFIXES.SERVERS, `${slug}_${number}`);
      void getDeps().cacheRepo.set(cacheKey, result.servers, ANIME_CACHE.SERVERS);
    }
    set({
      servers: result.servers,
      isLoading: false,
      error: result.error && result.error.name !== "AbortError" ? result.error.message : null,
    });
  },

  resolveStream: async (server: VideoServer, episodeUrl: string) => {
    const streamCacheKey = createCacheKey(CACHE_PREFIXES.STREAM, `${server.url}_${server.id}`);
    try {
      const cached = await getDeps().cacheRepo.get<{ url: string; headers?: Record<string, string> }>(streamCacheKey);
      if (cached && Date.now() < cached.expiration) {
        set({ streamUrl: cached.payload.url, streamHeaders: cached.payload.headers ?? null, lastLanguage: server.language, isLoading: false, error: null });
        return;
      }
    } catch {
    }
    set({ isLoading: true, streamUrl: null, streamHeaders: null, lastLanguage: server.language, error: null });
    const result = await getDeps().playerService.resolveStreamUrl(server, episodeUrl);
    if (result.stream != null) {
      void getDeps().cacheRepo.set(streamCacheKey, { url: result.stream.url, headers: result.stream.headers }, ANIME_CACHE.STREAM);
      set({
        streamUrl: result.stream.url,
        streamHeaders: result.stream.headers ?? null,
        isLoading: false,
        error: null,
      });
      return;
    }
    if (result.errorType === "AUTH_ERROR") {
      await getDeps().refreshSession();
      const retryResult = await getDeps().playerService.resolveStreamUrl(server, episodeUrl);
      if (retryResult.stream != null) {
        void getDeps().cacheRepo.set(streamCacheKey, { url: retryResult.stream.url, headers: retryResult.stream.headers }, ANIME_CACHE.STREAM);
        set({
          streamUrl: retryResult.stream.url,
          streamHeaders: retryResult.stream.headers ?? null,
          isLoading: false,
          error: null,
        });
        return;
      }
    }
    set({
      isLoading: false,
      streamUrl: null,
      streamHeaders: null,
      error: result.error?.message ?? "Failed to resolve stream",
    });
  },

  setStream: (url: string, headers: Record<string, string> | null) => {
    set({ streamUrl: url, streamHeaders: headers, error: null });
  },

  setLastLanguage: (language: string) => {
    set({ lastLanguage: language });
  },

  reset: () =>
    { set({
      servers: [],
      streamUrl: null,
      streamHeaders: null,
      lastLanguage: null,
      isLoading: false,
      error: null,
    }); },

  clearError: () => { set({ error: null }); },
}));
