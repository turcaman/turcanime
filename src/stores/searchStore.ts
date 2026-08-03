import { create } from "zustand";
import { source, type RawSearchItem } from "../services/source";
import { cleanTitle } from "../services/parsers";
import { withCache } from "../utils/cache";
import { CACHE_PREFIXES, CACHE_TTL, TIMEOUTS } from "../config/cache";
import { TMDB_IMAGE_BASE } from "../config/source";
import type { Anime, AppError, AutocompleteAnime } from "../types";

let searchController: AbortController | null = null;
let suggestionsController: AbortController | null = null;

// Search results and suggestions share one cache entry per query (same endpoint)
function normalizeSearchKey(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

function toAnime(item: RawSearchItem): Anime {
  return {
    title: cleanTitle(item.name),
    image: item.poster ? (item.poster.startsWith("http") ? item.poster : `${TMDB_IMAGE_BASE}${item.poster}`) : "",
    url: item.slug,
    status: "",
  };
}

function toSuggestion(item: RawSearchItem): AutocompleteAnime {
  return { name: item.name, slug: item.slug, type: item.type ?? "", poster: item.poster };
}

interface SearchState {
  searchAnimes: Anime[];
  suggestions: AutocompleteAnime[];
  lastSearchTerm: string;
  isSearchLoading: boolean;
  error: AppError | null;
  fetchSearch: (query: string, force?: boolean) => Promise<void>;
  fetchSuggestions: (query: string) => Promise<void>;
  cancelSearch: () => void;
  resetSearch: () => void;
  setSearchTerm: (term: string) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchAnimes: [],
  suggestions: [],
  lastSearchTerm: "",
  isSearchLoading: false,
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

    const cacheKey = `${CACHE_PREFIXES.SEARCH}_${normalizeSearchKey(query)}`;

    const result = await withCache<RawSearchItem[]>(
      cacheKey,
      async (sig) => {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Search timeout")), TIMEOUTS.SEARCH_TIMEOUT);
        });
        return await Promise.race([source.searchRaw(query, { signal: sig }), timeoutPromise]);
      },
      { ttl: CACHE_TTL.SEARCH, signal, force },
    );

    if (signal.aborted) return;

    if (result.error) {
      set({ error: { type: "UNKNOWN", message: result.error.message }, isSearchLoading: false });
    } else {
      set({ searchAnimes: (result.data ?? []).map(toAnime), isSearchLoading: false, error: null });
    }
  },

  fetchSuggestions: async (query: string) => {
    if (suggestionsController) suggestionsController.abort();
    suggestionsController = new AbortController();
    const signal = suggestionsController.signal;

    const cacheKey = `${CACHE_PREFIXES.SEARCH}_${normalizeSearchKey(query)}`;

    const result = await withCache<RawSearchItem[]>(
      cacheKey,
      (sig) => source.searchRaw(query, { signal: sig }),
      { ttl: CACHE_TTL.SEARCH, signal },
    );

    if (signal.aborted) return;
    set({ suggestions: (result.data ?? []).map(toSuggestion) });
  },

  cancelSearch: () => {
    if (searchController) searchController.abort();
    set({ isSearchLoading: false });
  },

  resetSearch: () => {
    if (searchController) searchController.abort();
    suggestionsController?.abort();
    set({ searchAnimes: [], suggestions: [], error: null, isSearchLoading: false });
  },

  setSearchTerm: (term: string) => set({ lastSearchTerm: term }),
}));
