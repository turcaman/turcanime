import { create } from "zustand";
import { source } from "../services/source";
import { withCache } from "../utils/cache";
import { withAuthRetry } from "../utils/retry";
import { SourceError } from "../utils/errors";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/cache";
import type { AppError, HomeData } from "../types";

let homeController: AbortController | null = null;

interface HomeState {
  homeData: HomeData;
  isHomeLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;
  fetchHome: (force?: boolean) => Promise<void>;
}

export const useHomeStore = create<HomeState>((set) => ({
  homeData: { recent: [] },
  isHomeLoading: false,
  isRefreshing: false,
  error: null,

  fetchHome: async (force = false) => {
    if (homeController) homeController.abort();
    homeController = new AbortController();
    const signal = homeController.signal;

    set({
      ...(force ? { homeData: { recent: [] } } : {}),
      isHomeLoading: true,
      isRefreshing: force,
      error: null,
    });

    const load = (attempt: number) =>
      withCache(
        CACHE_PREFIXES.HOME,
        (sig) => source.getHomeData({ signal: sig }),
        { ttl: CACHE_TTL.HOME, signal, force: attempt > 0 ? true : force },
      );

    if (homeController?.signal !== signal) return;

    try {
      const result = await withAuthRetry(load, {
        signal,
        maxRetries: 2,
        // The fresh challenge may still land after a failed refresh
        continueAfterRefreshFailure: true,
        tag: "homeStore",
      });

      if (homeController?.signal !== signal) return;
      if (signal.aborted) {
        set({ isHomeLoading: false, isRefreshing: false });
        return;
      }

      if (result.data && result.data.recent.length > 0) {
        set({ homeData: result.data, isHomeLoading: false, isRefreshing: false, error: null });
      } else if (result.error) {
        const err = result.error;
        set({
          isHomeLoading: false,
          isRefreshing: false,
          error:
            err instanceof SourceError
              ? { type: err.type, message: err.message }
              : { type: "UNKNOWN", message: err.message },
        });
      } else {
        set({ homeData: { recent: [] }, isHomeLoading: false, isRefreshing: false });
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        if (homeController?.signal === signal) set({ isHomeLoading: false, isRefreshing: false });
        return;
      }
      set({
        isHomeLoading: false,
        isRefreshing: false,
        error:
          e instanceof SourceError
            ? { type: e.type, message: e.message }
            : { type: "UNKNOWN", message: e instanceof Error ? e.message : String(e) },
      });
    }
  },
}));
