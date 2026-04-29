import { create } from "zustand";
import {
    clearAnimeCache,
    fetchDetailsData,
    fetchHomeData,
    fetchSearchData,
    fetchSuggestionsData,
} from "../application/services/animeService";
import {
    Anime,
    AnimeDetail,
    AppError,
    AutocompleteAnime,
    HomeData,
} from "../domain/entities";

// Controllers for cancelling stale requests
const controllers = {
  home: new AbortController(),
  search: new AbortController(),
  details: new AbortController(),
};

const createAbort = (key: keyof typeof controllers) => {
  controllers[key].abort();
  controllers[key] = new AbortController();
  return controllers[key];
};

interface AnimeState {
  homeData: HomeData;
  searchAnimes: Anime[];
  suggestions: AutocompleteAnime[];
  activeAnime: AnimeDetail | null;
  lastSearchTerm: string;
  error: AppError | null;

  // Separate loading states to prevent race conditions
  isHomeLoading: boolean;
  isSearchLoading: boolean;
  isDetailsLoading: boolean;
  isSuggestionsLoading: boolean;

  fetchHome: (force?: boolean) => Promise<void>;
  fetchSearch: (query: string, force?: boolean) => Promise<void>;
  fetchSuggestions: (query: string) => Promise<void>;
  fetchDetails: (slug: string, force?: boolean) => Promise<void>;
  cancelSearch: () => void;
  resetSearch: () => void;
  setSearchTerm: (term: string) => void;
  clearCache: () => Promise<void>;
}

export const useAnimeStore = create<AnimeState>((set, get) => ({
  homeData: { recent: [], popular: [], topViewed: [] },
  searchAnimes: [],
  suggestions: [],
  activeAnime: null,
  lastSearchTerm: "",
  error: null,

  // Separate loading states
  isHomeLoading: false,
  isSearchLoading: false,
  isDetailsLoading: false,
  isSuggestionsLoading: false,

  fetchHome: async (force = false) => {
    const controller = createAbort("home");
    set({ isHomeLoading: true, error: null });

    const result = await fetchHomeData(controller.signal, force);

    if (result.fromCache) {
      set({ homeData: result.data!, isHomeLoading: false, error: null });
    } else if (result.error) {
      set({ error: result.error, isHomeLoading: false });
    } else if (result.data) {
      set({ homeData: result.data, isHomeLoading: false, error: null });
    } else {
      set({ isHomeLoading: false });
    }
  },

  fetchSearch: async (query: string, force = false) => {
    if (!query?.trim()) {
      set({ searchAnimes: [], suggestions: [], error: null });
      return;
    }
    set({ suggestions: [], isSearchLoading: true, error: null });

    const controller = createAbort("search");
    const result = await fetchSearchData(query, controller.signal, force);

    if (result.error) {
      set({ error: result.error, isSearchLoading: false });
    } else {
      set({ searchAnimes: result.data || [], isSearchLoading: false, error: null });
    }
  },

  cancelSearch: () => {
    controllers.search.abort();
    set({ isSearchLoading: false });
  },

  fetchSuggestions: async (query: string) => {
    set({ isSuggestionsLoading: true });
    const data = await fetchSuggestionsData(query);
    set({ suggestions: data, isSuggestionsLoading: false });
  },

  fetchDetails: async (slug: string, force = false) => {
    if (force) {
      set({ activeAnime: null });
    }
    const controller = createAbort("details");
    set({ isDetailsLoading: true, error: null });

    const result = await fetchDetailsData(slug, controller.signal, force);

    if (result.error) {
      set({ error: result.error, isDetailsLoading: false });
    } else {
      set({ activeAnime: result.data || null, isDetailsLoading: false, error: null });
    }
  },

  resetSearch: () => {
    controllers.search.abort();
    set({ searchAnimes: [], suggestions: [], error: null, isSearchLoading: false });
  },

  setSearchTerm: (term: string) => set({ lastSearchTerm: term }),

  clearCache: async () => {
    await clearAnimeCache();
    set({
      homeData: { recent: [], popular: [], topViewed: [] },
      activeAnime: null,
    });
  },
}));
