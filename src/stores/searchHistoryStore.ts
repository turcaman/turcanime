import { create } from "zustand";
import { prependDedup, removeBy, persistWithRollback } from "../utils/history";
import { storage } from "../utils/storage";

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
    await persistWithRollback(
      () => storage.set(searchesKey, updated),
      () => set({ recentSearches: previous }),
      "searchHistoryStore",
    );
  },

  removeRecentSearch: async (term: string) => {
    const previous = get().recentSearches;
    const updated = removeBy(previous, (t) => t !== term);
    set({ recentSearches: updated });
    await persistWithRollback(
      () => storage.set(searchesKey, updated),
      () => set({ recentSearches: previous }),
      "searchHistoryStore",
    );
  },

  clearRecentSearches: async () => {
    set({ recentSearches: [] });
    await storage.remove(searchesKey);
  },
}));
