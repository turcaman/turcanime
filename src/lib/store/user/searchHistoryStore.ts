import { create } from "zustand";
import { getDeps } from "../../di";
import { prependDedup, removeBy } from "../../utils/history";
import { persistState } from "../../utils/storage";

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
    await persistState(searchesKey, updated, () => set({ recentSearches: previous }), "searchHistoryStore", "Failed to persist search");
  },

  removeRecentSearch: async (term: string) => {
    const previous = get().recentSearches;
    const updated = removeBy(previous, t => t !== term);
    set({ recentSearches: updated });
    await persistState(searchesKey, updated, () => set({ recentSearches: previous }), "searchHistoryStore", "Failed to persist removal");
  },

  clearRecentSearches: async () => {
    set({ recentSearches: [] });
    await getDeps().storage.remove(searchesKey);
  },
}));
