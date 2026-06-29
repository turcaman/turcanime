import { create } from "zustand";
import { getDeps } from "../di";
import type { Anime, AppError, AutocompleteAnime } from "../domain/entities";

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

    set({ suggestions: [], isSearchLoading: true, error: null });
    const result = await getDeps().animeService.fetchSearchData(query, searchController.signal, force);

    if (searchController.signal.aborted) return;

    if (result.error) {
      set({ error: result.error, isSearchLoading: false });
    } else {
      set({ searchAnimes: result.data ?? [], isSearchLoading: false, error: null });
    }
  },

  fetchSuggestions: async (query: string) => {
    if (suggestionsController) suggestionsController.abort();
    suggestionsController = new AbortController();

    set({ isSuggestionsLoading: true });
    const data = await getDeps().animeService.fetchSuggestionsData(query, suggestionsController.signal);
    if (suggestionsController.signal.aborted) return;
    set({ suggestions: data, isSuggestionsLoading: false });
  },

  cancelSearch: () => {
    if (searchController) searchController.abort();
    set({ isSearchLoading: false });
  },

  resetSearch: () => {
    if (searchController) searchController.abort();
    set({ searchAnimes: [], suggestions: [], error: null, isSearchLoading: false });
  },

  setSearchTerm: (term: string) => { set({ lastSearchTerm: term }); },
  setError: (error) => { set({ error }); },
}));
