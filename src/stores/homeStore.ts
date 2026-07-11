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

    const attempt = async (retryCount: number, isRetry: boolean): Promise<void> => {
      if (signal.aborted) return;

      const result = await withCache(
        CACHE_PREFIXES.HOME,
        (sig) => source.getHomeData({ signal: sig }),
        { ttl: CACHE_TTL.HOME, signal, force: isRetry ? true : force },
      );

      if (signal.aborted) return;

      const isAuthError = (result.error as { type?: string })?.type === "AUTH_ERROR";

      if (isAuthError && retryCount < 2) {
        logger.info("homeStore", `Auth error, refreshing session and retrying (attempt ${retryCount + 1}/3)...`);
        try {
          await refreshSession();
        } catch {
          logger.warn("homeStore", "Session refresh threw, continuing retry anyway");
        }
        if (signal.aborted) return;
        const backoff = retryCount === 0 ? 1000 : 2000;
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return attempt(retryCount + 1, true);
      }

      if (signal.aborted) return;

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
          isRefreshing: false,
          error: { type: "UNKNOWN", message: result.error.message },
        });
      } else {
        set({
          homeData: { recent: [] },
          isHomeLoading: false,
          isRefreshing: false,
        });
      }
    };

    await attempt(0, false);
  },

  reset: () => {
    homeController?.abort();
    set({ homeData: { recent: [] }, error: null, isHomeLoading: false, isRefreshing: false });
  },
}));
