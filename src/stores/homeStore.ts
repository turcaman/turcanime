import { create } from "zustand";
import { source } from "../services/source";
import { withCache } from "../utils/cache";
import { refreshSession } from "../services/session";
import { logger } from "../utils/logger";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/cache";
import type { AppError, HomeData } from "../types";

let homeController: AbortController | null = null;

interface HomeState {
  homeData: HomeData;
  isHomeLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;
  fetchHome: (force?: boolean) => Promise<void>;
  prepareRefresh: () => void;
  reset: () => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  homeData: { recent: [] },
  isHomeLoading: false,
  isRefreshing: false,
  error: null,

  prepareRefresh: () => {
    set({ homeData: { recent: [] }, isHomeLoading: true, isRefreshing: true, error: null });
  },

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

    const result = await withCache(
      CACHE_PREFIXES.HOME,
      (sig) => source.getHomeData({ signal: sig }),
      { ttl: CACHE_TTL.HOME, signal, force },
    );

    if (signal.aborted) return;

    if ((result.error as { type?: string })?.type === "AUTH_ERROR") {
      logger.info("homeStore", "Auth error, refreshing session and retrying...");
      try {
        await refreshSession();
        if (signal.aborted) return;
        const retryResult = await withCache(
          CACHE_PREFIXES.HOME,
          (sig) => source.getHomeData({ signal: sig }),
          { ttl: CACHE_TTL.HOME, signal, force: true },
        );
        if (signal.aborted) return;
        if (retryResult.data && retryResult.data.recent.length > 0) {
          set({ homeData: retryResult.data, isHomeLoading: false, isRefreshing: false, error: null });
          return;
        }
        result.error = retryResult.error ?? result.error;
      } catch {
        logger.info("homeStore", "Auto-recovery failed, falling through to error state");
      }
    }

    if (result.data && result.data.recent.length > 0) {
      set({
        homeData: result.data,
        isHomeLoading: false,
        isRefreshing: false,
        error: null,
      });
    } else if (result.error) {
      set({
        isHomeLoading: false,
        isRefreshing: force ? false : false,
        error: { type: "UNKNOWN", message: result.error.message },
      });
    } else {
      set({
        homeData: { recent: [] },
        isHomeLoading: false,
        isRefreshing: false,
      });
    }
  },

  reset: () => {
    homeController?.abort();
    set({ homeData: { recent: [] }, error: null, isHomeLoading: false, isRefreshing: false });
  },
}));
