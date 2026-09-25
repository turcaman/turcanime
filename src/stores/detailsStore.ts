import { create } from "zustand";
import { source } from "../services/source";
import { withCache } from "../utils/cache";
import { withAuthRetry } from "../utils/retry";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/cache";
import type { AnimeDetail, AppError } from "../types";

let detailsController: AbortController | null = null;

interface DetailsState {
  activeAnime: AnimeDetail | null;
  isDetailsLoading: boolean;
  error: AppError | null;
  fetchDetails: (slug: string, force?: boolean) => Promise<void>;
}

export const useDetailsStore = create<DetailsState>((set) => ({
  activeAnime: null,
  isDetailsLoading: false,
  error: null,

  fetchDetails: async (slug: string, force = false) => {
    if (detailsController) detailsController.abort();
    detailsController = new AbortController();
    const signal = detailsController.signal;

    set({ isDetailsLoading: true, error: null });

    const cacheKey = `${CACHE_PREFIXES.ANIME}_${slug}`;

    const fetchFresh = (attempt: number) =>
      withCache(cacheKey, (s) => source.getDetails(slug, { signal: s }), {
        ttl: CACHE_TTL.DETAILS,
        signal,
        force: attempt > 0 ? true : force,
      });

    try {
      const result = await withAuthRetry(fetchFresh, { signal, maxRetries: 2, tag: "detailsStore" });
      if (signal.aborted) return;
      if (result.error) {
        set({ error: { type: "UNKNOWN", message: result.error.message }, isDetailsLoading: false });
      } else {
        set({ activeAnime: result.data ?? null, isDetailsLoading: false, error: null });
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      set({
        error: { type: "UNKNOWN", message: e instanceof Error ? e.message : String(e) },
        isDetailsLoading: false,
      });
    }
  },
}));
