import { create } from "zustand";
import { getDeps } from "../../di";
import { HistoryItem } from "../../domain/entities";
import { computeContinueWatching, prependDedup, removeBy } from "../../utils/history";
import { persistState } from "../../utils/storage";

const historyKey = "last_viewed";

interface HistoryState {
  lastViewed: HistoryItem[];
  continueWatching: HistoryItem[];
  initialize: (data: HistoryItem[]) => void;
  addToHistory: (item: HistoryItem) => Promise<void>;
  removeFromHistory: (url: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  lastViewed: [],
  continueWatching: [],

  initialize: (data: HistoryItem[]) => {
    set({ lastViewed: data, continueWatching: computeContinueWatching(data) });
  },

  addToHistory: async (item: HistoryItem) => {
    const newItem = { ...item, timestamp: Date.now() };
    const previous = get().lastViewed;
    const updated = prependDedup(previous, newItem, 50, "url");
    
    set({ lastViewed: updated, continueWatching: computeContinueWatching(updated) });
    await persistState(historyKey, updated, () => set({ lastViewed: previous, continueWatching: computeContinueWatching(previous) }), "historyStore", "Failed to persist history");
  },

  removeFromHistory: async (url: string) => {
    const previous = get().lastViewed;
    const updated = removeBy(previous, i => i.url !== url);
    
    set({ lastViewed: updated, continueWatching: computeContinueWatching(updated) });
    await persistState(historyKey, updated, () => set({ lastViewed: previous, continueWatching: computeContinueWatching(previous) }), "historyStore", "Failed to persist removal");
  },

  clearHistory: async () => {
    set({ lastViewed: [], continueWatching: [] });
    await getDeps().storage.remove(historyKey);
  },
}));
