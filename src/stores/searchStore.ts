import { create } from "zustand";
import { source, type RawSearchItem } from "../services/source";
import { cleanTitle } from "../services/parsers";
import { loadCached } from "../utils/cache";
import { withAuthRetry } from "../utils/retry";
import { ResourceRunner, resourceInitialState, type ResourceState } from "../utils/resource";
import { logger } from "../utils/logger";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/cache";
import { TMDB_IMAGE_BASE } from "../config/source";
import type { Anime, AutocompleteAnime } from "../types";

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
  results: ResourceState<Anime[]>;
  suggestions: ResourceState<AutocompleteAnime[]>;
  lastSearchTerm: string;
  fetchSearch: (query: string, force?: boolean) => Promise<void>;
  fetchSuggestions: (query: string) => Promise<void>;
  clearSuggestions: () => void;
  cancelSearch: () => void;
  resetSearch: () => void;
  setSearchTerm: (term: string) => void;
}

export const useSearchStore = create<SearchState>((set, get) => {
  const resultsRunner = new ResourceRunner<Anime[]>({
    tag: "search",
    get: () => get().results,
    set: (results) => set({ results }),
  });
  const suggestionsRunner = new ResourceRunner<AutocompleteAnime[]>({
    tag: "suggestions",
    get: () => get().suggestions,
    set: (suggestions) => set({ suggestions }),
  });

  return {
    results: resourceInitialState<Anime[]>(),
    suggestions: resourceInitialState<AutocompleteAnime[]>(),
    lastSearchTerm: "",

    fetchSearch: async (query: string, force = false) => {
      const trimmed = query.trim();
      if (!trimmed) {
        resultsRunner.reset();
        suggestionsRunner.reset();
        return;
      }
      // A search supersedes suggestions; both hit the same heavy endpoint and
      // running concurrently over one session makes each other time out
      suggestionsRunner.reset();

      const cacheKey = `${CACHE_PREFIXES.SEARCH}_${normalizeSearchKey(trimmed)}`;
      await resultsRunner.load(trimmed, async (signal) => {
        if (!force) {
          const memory = memoryGet(cacheKey);
          if (memory != null) {
            logger.debug("search", `Memory hit for "${trimmed}" (${memory.length} items)`);
            return memory.map(toAnime);
          }
        }
        const raw = await withAuthRetry(
          (attempt) =>
            loadCached(cacheKey, (sig) => source.searchRaw(trimmed, { signal: sig }), {
              ttl: CACHE_TTL.SEARCH,
              signal,
              force: attempt > 0 ? true : force,
            }),
          {
            signal,
            maxRetries: 2,
            continueAfterRefreshFailure: true,
            tag: "search",
          },
        );
        if (raw.length > 0) memorySet(cacheKey, raw);
        return raw.map(toAnime);
      });
    },

    fetchSuggestions: async (query: string) => {
      const cacheKey = `${CACHE_PREFIXES.SEARCH}_${normalizeSearchKey(query)}`;
      await suggestionsRunner.load(query, async (signal) => {
        const raw = await loadCached(cacheKey, (sig) => source.searchRaw(query, { signal: sig }), {
          ttl: CACHE_TTL.SEARCH,
          signal,
        });
        return raw.map(toSuggestion);
      });
    },

    clearSuggestions: () => {
      suggestionsRunner.reset();
    },

    cancelSearch: () => {
      resultsRunner.cancel();
    },

    resetSearch: () => {
      resultsRunner.reset();
      suggestionsRunner.reset();
    },

    setSearchTerm: (term: string) => set({ lastSearchTerm: term }),
  };
});
