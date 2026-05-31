import { create } from "zustand";
import { getDeps } from "../di";
import type { Anime, AppError, AutocompleteAnime } from "../domain/entities";
import { abortManager } from "../utils/AbortControllerManager";

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
    if (!query?.trim()) {
      set({ searchAnimes: [], suggestions: [], error: null });
      return;
    }
    set({ suggestions: [], isSearchLoading: true, error: null });

    const controller = abortManager.getController("search");
    const result = await getDeps().animeService.fetchSearchData(query, controller.signal, force);

    if (result.error) {
      set({ error: result.error, isSearchLoading: false });
    } else {
      set({ searchAnimes: result.data || [], isSearchLoading: false, error: null });
    }
  },

  fetchSuggestions: async (query: string) => {
    set({ isSuggestionsLoading: true });
    const controller = abortManager.getController("suggestions");
    try {
      const data = await getDeps().animeService.fetchSuggestionsData(query, controller.signal);
      set({ suggestions: data, isSuggestionsLoading: false });
    } finally {
      abortManager.remove("suggestions");
    }
  },

  cancelSearch: () => {
    abortManager.abort("search");
    set({ isSearchLoading: false });
  },

  resetSearch: () => {
    abortManager.abort("search");
    set({ searchAnimes: [], suggestions: [], error: null, isSearchLoading: false });
  },

  setSearchTerm: (term: string) => set({ lastSearchTerm: term }),
  setError: (error) => set({ error }),
}));
