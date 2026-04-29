import { create } from "zustand";
import {
    fetchEpisodeServers,
    resolveStreamUrl
} from "../application/services/playerService";
import { VideoServer } from "../domain/entities";

interface PlayerState {
  servers: VideoServer[];
  streamUrl: string | null;
  streamHeaders: Record<string, string> | null;
  isLoading: boolean;

  fetchServers: (
    slug: string,
    number: string,
    force?: boolean,
  ) => Promise<void>;
  resolveStream: (server: VideoServer) => Promise<void>;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  servers: [],
  streamUrl: null,
  streamHeaders: null,
  isLoading: false,

  fetchServers: async (slug: string, number: string, force = false) => {
    set({ isLoading: true, servers: [] });
    const result = await fetchEpisodeServers(slug, number, force);
    set({
      servers: result.servers,
      isLoading: false,
    });
  },

  resolveStream: async (server: VideoServer) => {
    set({ isLoading: true, streamUrl: null, streamHeaders: null });
    const result = await resolveStreamUrl(server);
    if (result.stream) {
      set({
        streamUrl: result.stream.url,
        streamHeaders: result.stream.headers ?? null,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },

  reset: () =>
    set({
      servers: [],
      streamUrl: null,
      streamHeaders: null,
      isLoading: false,
    }),
}));
