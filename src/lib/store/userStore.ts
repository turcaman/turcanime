import { create } from "zustand";
import { getDeps } from "../di";
import { HistoryItem } from "../domain/entities";

// ─── Storage keys ──────────────────────────────────────────────────────
const EPISODE_ORDER_KEY = "episode_order";

// Keys for history/searches (simplified, no longer mode-prefixed)
const historyKey = "last_viewed";
const searchesKey = "recent_searches";

// ─── Generic list helpers (DRY) ────────────────────────────────────────

/** Prepend item, deduplicate by key, trim to max length. */
function prependDedup<T>(list: T[], item: T, max: number, dedupKey?: keyof T): T[] {
  const filtered = dedupKey
    ? list.filter(i => i[dedupKey] !== item[dedupKey])
    : list.filter(i => i !== item);
  return [item, ...filtered].slice(0, max);
}

/** Remove items matching the predicate, return new array. */
function removeBy<T>(list: T[], predicate: (item: T) => boolean): T[] {
  return list.filter(predicate);
}

// ─── State interface ───────────────────────────────────────────────────

interface UserState {
  lastViewed: HistoryItem[];
  recentSearches: string[];
  episodeOrder: "asc" | "desc";
  isInitialized: boolean;

  initialize: () => Promise<void>;
  addToHistory: (item: HistoryItem) => Promise<void>;
  removeFromHistory: (url: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  saveRecentSearch: (term: string) => Promise<void>;
  removeRecentSearch: (term: string) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
  clearAllData: () => Promise<void>;
  setEpisodeOrder: (order: "asc" | "desc") => Promise<void>;
  getContinueWatching: () => HistoryItem[];
}

export const useUserStore = create<UserState>((set, get) => ({
  lastViewed: [],
  recentSearches: [],
  episodeOrder: "asc",
  isInitialized: false,

  initialize: async () => {
    const history = await getDeps().storage.get<HistoryItem[]>(historyKey);
    const searches = await getDeps().storage.get<string[]>(searchesKey);
    const order = await getDeps().storage.get<"asc" | "desc">(EPISODE_ORDER_KEY);
    set({
      lastViewed: history || [],
      recentSearches: searches || [],
      episodeOrder: order || "asc",
      isInitialized: true,
    });
  },

  addToHistory: async (item: HistoryItem) => {
    const newItem = { ...item, timestamp: Date.now() };
    const updated = prependDedup(get().lastViewed, newItem, 50, "url");
    set({ lastViewed: updated });
    await getDeps().storage.set(historyKey, updated);
  },

  removeFromHistory: async (url: string) => {
    const updated = removeBy(get().lastViewed, i => i.url !== url);
    set({ lastViewed: updated });
    await getDeps().storage.set(historyKey, updated);
  },

  clearHistory: async () => {
    set({ lastViewed: [] });
    await getDeps().storage.remove(historyKey);
  },

  saveRecentSearch: async (term: string) => {
    const updated = prependDedup(get().recentSearches, term, 10);
    set({ recentSearches: updated });
    await getDeps().storage.set(searchesKey, updated);
  },

  removeRecentSearch: async (term: string) => {
    const updated = removeBy(get().recentSearches, t => t !== term);
    set({ recentSearches: updated });
    await getDeps().storage.set(searchesKey, updated);
  },

  clearRecentSearches: async () => {
    set({ recentSearches: [] });
    await getDeps().storage.remove(searchesKey);
  },

  clearAllData: async () => {
    set({ lastViewed: [], recentSearches: [], episodeOrder: "asc" });
    await getDeps().storage.clear();
  },

  setEpisodeOrder: async (order: "asc" | "desc") => {
    set({ episodeOrder: order });
    await getDeps().storage.set(EPISODE_ORDER_KEY, order);
  },

  getContinueWatching: () => {
    const history = get().lastViewed;
    const uniqueAnimes = new Map<string, HistoryItem>();

    // We process from oldest to newest so the latest episode for each anime wins
    history.forEach(item => {
      uniqueAnimes.set(item.url, item);
    });

    return Array.from(uniqueAnimes.values()).slice(0, 8);
  },
}));
