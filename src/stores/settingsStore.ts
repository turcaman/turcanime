import { create } from "zustand";
import { storage } from "../utils/storage";
import { logger } from "../utils/logger";

const EPISODE_ORDER_KEY = "episode_order";

interface SettingsState {
  episodeOrder: "asc" | "desc";
  cacheInvalidationTimestamp: number;
  initialize: (order: "asc" | "desc") => void;
  setEpisodeOrder: (order: "asc" | "desc") => Promise<void>;
  invalidateCache: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  episodeOrder: "asc",
  cacheInvalidationTimestamp: 0,

  initialize: (order: "asc" | "desc") => set({ episodeOrder: order }),

  setEpisodeOrder: async (order: "asc" | "desc") => {
    const previous = get().episodeOrder;
    set({ episodeOrder: order });
    try {
      await storage.set(EPISODE_ORDER_KEY, order);
    } catch (error) {
      set({ episodeOrder: previous });
      logger.error("settingsStore", "Failed to persist order", error);
    }
  },

  invalidateCache: () => set({ cacheInvalidationTimestamp: Date.now() }),
}));
