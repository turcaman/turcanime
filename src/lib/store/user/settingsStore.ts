import { create } from "zustand";
import { persistState } from "../../utils/storage";

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
    await persistState(EPISODE_ORDER_KEY, order, () => set({ episodeOrder: previous }), "settingsStore", "Failed to persist order");
  },

  invalidateCache: () => set({ cacheInvalidationTimestamp: Date.now() }),
}));
