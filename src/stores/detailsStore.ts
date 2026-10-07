import { create } from "zustand";
import { source } from "../services/source";
import { withCache } from "../utils/cache";
import { withAuthRetry } from "../utils/retry";
import { SourceError } from "../utils/errors";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/cache";
import type { AnimeDetail, AppError } from "../types";

let detailsController: AbortController | null = null;
let detailsGeneration = 0;

interface DetailsState {
  activeAnime: AnimeDetail | null;
  isDetailsLoading: boolean;
  error: AppError | null;
  hasAttempted: boolean;
  fetchDetails: (slug: string, force?: boolean) => Promise<void>;
}

export const useDetailsStore = create<DetailsState>((set) => ({
  activeAnime: null,
  isDetailsLoading: false,
  error: null,
  hasAttempted: false,

  fetchDetails: async (slug: string, force = false) => {
    if (detailsController) detailsController.abort();
    detailsController = new AbortController();
    const signal = detailsController.signal;
    const generation = ++detailsGeneration;
    const isCurrent = () => generation === detailsGeneration;

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
      if (!isCurrent()) return;
      if (signal.aborted) {
        set({ isDetailsLoading: false, hasAttempted: true });
        return;
      }
      if (result.error) {
        const err = result.error;
        set({
          error:
            err instanceof SourceError
              ? { type: err.type, message: err.message }
              : { type: "UNKNOWN", message: err.message },
          isDetailsLoading: false,
          hasAttempted: true,
        });
      } else if (result.data) {
        set({ activeAnime: result.data, isDetailsLoading: false, error: null, hasAttempted: true });
      } else {
        set({
          error: { type: "UNKNOWN", message: "Contenido no encontrado" },
          isDetailsLoading: false,
          hasAttempted: true,
        });
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        if (isCurrent()) set({ isDetailsLoading: false, hasAttempted: true });
        return;
      }
      if (!isCurrent()) return;
      set({
        error:
          e instanceof SourceError
            ? { type: e.type, message: e.message }
            : { type: "UNKNOWN", message: e instanceof Error ? e.message : String(e) },
        isDetailsLoading: false,
        hasAttempted: true,
      });
    }
  },
}));
