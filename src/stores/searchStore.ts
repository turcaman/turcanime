import { create } from "zustand";
import { source, type RawSearchItem } from "../services/source";
import { cleanTitle } from "../services/parsers";
import { withCache } from "../utils/cache";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/cache";
import { TMDB_IMAGE_BASE } from "../config/source";
import type { Anime, AppError, AutocompleteAnime } from "../types";

let searchController: AbortController | null = null;
let suggestionsController: AbortController | null = null;

// Search results and suggestions share one cache entry per query (same endpoint)
function normalizeSearchKey(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

// Large result sets exceed the storage cache limit and get dropped, so repeat
// searches re-hit the network and the site throttles them with an empty 200.
// This in-memory layer has no size limit and serves repeats instantly.
const MEMORY_MAX_ENTRIES = 12;
const memoryResults = new Map<string, { payload: RawSearchItem[]; expiresAt: number }>();

function memoryGet(key: string): RawSearchItem[] | null {
  const entry = memoryResults.get(key);
  if (entry == null) return null;
  if (Date.now() >= entry.expiresAt) {
    memoryResults.delete(key);
    return null;
  }
  return entry.payload;
}

function memorySet(key: string, payload: RawSearchItem[]): void {
  if (payload.length === 0) return;
  memoryResults.delete(key);
  memoryResults.set(key, { payload, expiresAt: Date.now() + CACHE_TTL.SEARCH });
  if (memoryResults.size > MEMORY_MAX_ENTRIES) {
    const oldest = memoryResults.keys().next().value;
    if (oldest != null) memoryResults.delete(oldest);
  }
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
  clearSuggestions: () => void;
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
    // A search supersedes suggestions; both hit the same heavy endpoint and
    // running concurrently over one session makes each other time out
    suggestionsController?.abort();
    suggestionsController = null;
    if (searchController) searchController.abort();
    searchController = new AbortController();
    const signal = searchController.signal;

    set({ suggestions: [], isSearchLoading: true, error: null });

    const cacheKey = `${CACHE_PREFIXES.SEARCH}_${normalizeSearchKey(query)}`;

    if (!force) {
      const memory = memoryGet(cacheKey);
      if (memory != null) {
        set({ searchAnimes: memory.map(toAnime), isSearchLoading: false, error: null });
        return;
      }
    }

    const result = await withCache<RawSearchItem[]>(
      cacheKey,
      (sig) => source.searchRaw(query, { signal: sig }),
      { ttl: CACHE_TTL.SEARCH, signal, force },
    );

    if (signal.aborted) return;

    if (result.data != null && result.data.length > 0) {
      memorySet(cacheKey, result.data);
    }

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

  clearSuggestions: () => {
    suggestionsController?.abort();
    suggestionsController = null;
    set({ suggestions: [] });
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
