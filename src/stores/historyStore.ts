import { create } from "zustand";
import type { HistoryItem } from "../types";
import { computeContinueWatching, removeBy } from "../utils/history";
import { storage } from "../utils/storage";
import { logger } from "../utils/logger";

const historyKey = "last_viewed";
const watchedKey = "watched_episodes";

interface HistoryState {
  lastViewed: HistoryItem[];
  continueWatching: HistoryItem[];
  watched: string[];
  initialize: (data: HistoryItem[], watchedData?: string[]) => void;
  addToHistory: (item: HistoryItem) => Promise<void>;
  removeFromHistory: (url: string) => Promise<void>;
  toggleWatched: (slug: string, episodeNumber: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  lastViewed: [],
  continueWatching: [],
  watched: [],

  initialize: (data: HistoryItem[], watchedData?: string[]) => {
    set({ lastViewed: data, continueWatching: computeContinueWatching(data), watched: watchedData ?? [] });
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

  toggleWatched: async (slug: string, episodeNumber: string) => {
    const key = `${slug}|${episodeNumber}`;
    const previous = get().watched;
    const updated = previous.includes(key)
      ? previous.filter((k) => k !== key)
      : [...previous, key];

    set({ watched: updated });
    try {
      await storage.set(watchedKey, updated);
    } catch (error) {
      set({ watched: previous });
      logger.error("historyStore", "Failed to persist watched", error);
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
