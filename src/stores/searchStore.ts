import { create } from "zustand";
import { animeLatino } from "../services/animeLatino";
import { withCache } from "../utils/cache";
import { CACHE_PREFIXES, CACHE_TTL, TIMEOUTS } from "../config/cache";
import type { Anime, AppError, AutocompleteAnime } from "../types";

let searchController: AbortController | null = null;
let suggestionsController: AbortController | null = null;

interface SearchState {
  searchAnimes: Anime[];
  suggestions: AutocompleteAnime[];
  lastSearchTerm: string;
  isSearchLoading: boolean;
  isSuggestionsLoading: boolean;
  error: AppError | null;
  fetchSearch: (query: string, force?: boolean) => Promise<void>;
  fetchSuggestions: (query: string) => Promise<void>;
  cancelSearch: () => void;
  resetSearch: () => void;
  setSearchTerm: (term: string) => void;
  setError: (error: AppError | null) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchAnimes: [],
  suggestions: [],
  lastSearchTerm: "",
  isSearchLoading: false,
  isSuggestionsLoading: false,
  error: null,

  fetchSearch: async (query: string, force = false) => {
    if (!query.trim()) {
      set({ searchAnimes: [], suggestions: [], error: null });
      return;
    }
    if (searchController) searchController.abort();
    searchController = new AbortController();
    const signal = searchController.signal;

    set({ suggestions: [], isSearchLoading: true, error: null });

    const cacheKey = `${CACHE_PREFIXES.SEARCH}_${query.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

    const result = await withCache(
      cacheKey,
      async (sig) => {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Search timeout")), TIMEOUTS.SEARCH);
        });
        const searchPromise = animeLatino.search(query, { signal: sig });
        return await Promise.race([searchPromise, timeoutPromise]);
      },
      { ttl: CACHE_TTL.SEARCH, signal, force },
    );

    if (signal.aborted) return;

    if (result.error) {
      set({ error: { type: "UNKNOWN", message: result.error.message }, isSearchLoading: false });
    } else {
      set({ searchAnimes: result.data ?? [], isSearchLoading: false, error: null });
    }
  },

  fetchSuggestions: async (query: string) => {
    if (suggestionsController) suggestionsController.abort();
    suggestionsController = new AbortController();
    const signal = suggestionsController.signal;

    set({ isSuggestionsLoading: true });
    const cacheKey = `${CACHE_PREFIXES.SUGGESTIONS}_${query.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

    const result = await withCache(
      cacheKey,
      (sig) => animeLatino.getSuggestions(query, { signal: sig }),
      { ttl: CACHE_TTL.SUGGESTIONS, signal },
    );

    if (signal.aborted) return;
    set({ suggestions: result.data ?? [], isSuggestionsLoading: false });
  },

  cancelSearch: () => {
    if (searchController) searchController.abort();
    set({ isSearchLoading: false });
  },

  resetSearch: () => {
    if (searchController) searchController.abort();
    set({ searchAnimes: [], suggestions: [], error: null, isSearchLoading: false });
  },

  setSearchTerm: (term: string) => set({ lastSearchTerm: term }),
  setError: (error) => set({ error }),
}));
