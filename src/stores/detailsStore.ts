import { create } from "zustand";
import { source } from "../services/source";
import { withCache } from "../utils/cache";
import { refreshSession } from "../services/session";
import { logger } from "../utils/logger";
import { isAuthError } from "../utils/errors";
import { backoffDelay } from "../utils/math";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/cache";
import type { AnimeDetail, AppError } from "../types";

let detailsController: AbortController | null = null;

// Cloudflare can re-challenge repeatedly; one retry often races the challenge
const MAX_AUTH_RETRIES = 2;

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

    const fetchFresh = (sig: AbortSignal, force = true) =>
      withCache(cacheKey, (s) => source.getDetails(slug, { signal: s }), {
        ttl: CACHE_TTL.DETAILS,
        signal: sig,
        force,
      });

    const result = await fetchFresh(signal, force);

    if (signal.aborted) return;

    let lastError = result.error;
    if (isAuthError(lastError)) {
      for (let retry = 0; retry < MAX_AUTH_RETRIES; retry++) {
        logger.info("detailsStore", `Auth error, refreshing session and retrying (${retry + 1}/${MAX_AUTH_RETRIES})...`);
        try {
          await refreshSession();
        } catch {
          logger.info("detailsStore", "Auto-recovery failed, falling through to error state");
          break;
        }
        if (signal.aborted) return;
        await new Promise((resolve) => setTimeout(resolve, backoffDelay(retry)));
        const retryResult = await fetchFresh(signal);
        if (signal.aborted) return;
        if (retryResult.data) {
          set({ activeAnime: retryResult.data, isDetailsLoading: false, error: null });
          return;
        }
        lastError = retryResult.error;
        if (!isAuthError(lastError)) break;
      }
    }

    if (lastError) {
      set({ error: { type: "UNKNOWN", message: lastError.message }, isDetailsLoading: false });
    } else {
      set({ activeAnime: result.data ?? null, isDetailsLoading: false, error: null });
    }
  },


}));
