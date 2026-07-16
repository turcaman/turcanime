import { create } from "zustand";
import type { HistoryItem } from "../types";
import { computeContinueWatching, removeBy } from "../utils/history";
import { storage } from "../utils/storage";
import { logger } from "../utils/logger";

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
    const updated = [newItem, ...previous.filter(
      (i) => i.url !== newItem.url || i.number !== newItem.number,
    )].slice(0, 50);

    set({ lastViewed: updated, continueWatching: computeContinueWatching(updated) });
    try {
      await storage.set(historyKey, updated);
    } catch (error) {
      set({ lastViewed: previous, continueWatching: computeContinueWatching(previous) });
      logger.error("historyStore", "Failed to persist history", error);
    }
  },

  removeFromHistory: async (url: string) => {
    const previous = get().lastViewed;
    const updated = removeBy(previous, (i) => i.url !== url);

    set({ lastViewed: updated, continueWatching: computeContinueWatching(updated) });
    try {
      await storage.set(historyKey, updated);
    } catch (error) {
      set({ lastViewed: previous, continueWatching: computeContinueWatching(previous) });
      logger.error("historyStore", "Failed to persist removal", error);
    }
  },

  clearHistory: async () => {
    set({ lastViewed: [], continueWatching: [] });
    await storage.remove(historyKey);
  },
}));
