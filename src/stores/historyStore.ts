import { create } from "zustand";
import type { HistoryItem } from "../types";
import { computeContinueWatching, removeBy, persistWithRollback } from "../utils/history";
import { storage } from "../utils/storage";

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
    await persistWithRollback(
      () => storage.set(historyKey, updated),
      () => set({ lastViewed: previous, continueWatching: computeContinueWatching(previous) }),
      "historyStore",
    );
  },

  removeFromHistory: async (url: string) => {
    const previous = get().lastViewed;
    const updated = removeBy(previous, (i) => i.url !== url);

    set({ lastViewed: updated, continueWatching: computeContinueWatching(updated) });
    await persistWithRollback(
      () => storage.set(historyKey, updated),
      () => set({ lastViewed: previous, continueWatching: computeContinueWatching(previous) }),
      "historyStore",
    );
  },

  clearHistory: async () => {
    set({ lastViewed: [], continueWatching: [] });
    await storage.remove(historyKey);
  },
}));
