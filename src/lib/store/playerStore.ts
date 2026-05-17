import { create } from "zustand";
import { getDeps } from "../di";
import { VideoServer } from "../domain/entities";

interface PlayerState {
  servers: VideoServer[];
  streamUrl: string | null;
  streamHeaders: Record<string, string> | null;
  isLoading: boolean;
  error: string | null;

  fetchServers: (
    slug: string,
    number: string,
    force?: boolean,
    signal?: AbortSignal,
  ) => Promise<void>;
  resolveStream: (server: VideoServer) => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  servers: [],
  streamUrl: null,
  streamHeaders: null,
  isLoading: false,
  error: null,

  fetchServers: async (slug: string, number: string, force = false, signal?: AbortSignal) => {
    set({ isLoading: true, servers: [], error: null });
    const result = await getDeps().playerService.fetchEpisodeServers(slug, number, force, signal);
    set({
      servers: result.servers,
      isLoading: false,
      error: result.error && result.error.name !== "AbortError" ? result.error.message : null,
    });
  },

  resolveStream: async (server: VideoServer) => {
    set({ isLoading: true, streamUrl: null, streamHeaders: null, error: null });
    const result = await getDeps().playerService.resolveStreamUrl(server);
    if (result.stream) {
      set({
        streamUrl: result.stream.url,
        streamHeaders: result.stream.headers ?? null,
        isLoading: false,
        error: null,
      });
    } else {
      set({
        isLoading: false,
        streamUrl: null,
        streamHeaders: null,
        error: result.error?.message || "Failed to resolve stream",
      });
    }
  },

  reset: () =>
    set({
      servers: [],
      streamUrl: null,
      streamHeaders: null,
      isLoading: false,
      error: null,
    }),

  clearError: () => set({ error: null }),
}));
