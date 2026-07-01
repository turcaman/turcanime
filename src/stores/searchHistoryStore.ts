import { create } from "zustand";
import { prependDedup, removeBy } from "../utils/history";
import { storage } from "../utils/storage";
import { logger } from "../utils/logger";

const searchesKey = "recent_searches";

interface SearchHistoryState {
  recentSearches: string[];
  initialize: (data: string[]) => void;
  saveRecentSearch: (term: string) => Promise<void>;
  removeRecentSearch: (term: string) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
}

export const useSearchHistoryStore = create<SearchHistoryState>((set, get) => ({
  recentSearches: [],

  initialize: (data: string[]) => set({ recentSearches: data }),

  saveRecentSearch: async (term: string) => {
    const previous = get().recentSearches;
    const updated = prependDedup(previous, term, 10);
    set({ recentSearches: updated });
    try {
      await storage.set(searchesKey, updated);
    } catch (error) {
      set({ recentSearches: previous });
      logger.error("searchHistoryStore", "Failed to persist search", error);
    }
  },

  removeRecentSearch: async (term: string) => {
    const previous = get().recentSearches;
    const updated = removeBy(previous, (t) => t !== term);
    set({ recentSearches: updated });
    try {
      await storage.set(searchesKey, updated);
    } catch (error) {
      set({ recentSearches: previous });
      logger.error("searchHistoryStore", "Failed to persist removal", error);
    }
  },

  clearRecentSearches: async () => {
    set({ recentSearches: [] });
    await storage.remove(searchesKey);
  },
}));
