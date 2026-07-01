import { create } from "zustand";
import { animeLatino } from "../services/animeLatino";
import { withCache } from "../utils/cache";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/cache";
import type { AnimeDetail, AppError } from "../types";

let detailsController: AbortController | null = null;

interface DetailsState {
  activeAnime: AnimeDetail | null;
  isDetailsLoading: boolean;
  error: AppError | null;
  fetchDetails: (slug: string, force?: boolean) => Promise<void>;
  reset: () => void;
  setError: (error: AppError | null) => void;
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

    const cacheKey = `${CACHE_PREFIXES.DETAILS}_${slug}`;

    const result = await withCache(
      cacheKey,
      (sig) => animeLatino.getDetails(slug, { signal: sig }),
      { ttl: CACHE_TTL.DETAILS, signal, force },
    );

    if (signal.aborted) return;

    if (result.error) {
      set({ error: { type: "UNKNOWN", message: result.error.message }, isDetailsLoading: false });
    } else {
      set({ activeAnime: result.data ?? null, isDetailsLoading: false, error: null });
    }
  },

  reset: () => set({ activeAnime: null, error: null, isDetailsLoading: false }),
  setError: (error) => set({ error }),
}));
