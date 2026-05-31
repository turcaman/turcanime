import { create } from "zustand";
import { getDeps } from "../di";
import type { AppError, HomeData } from "../domain/entities";
import { abortManager } from "../utils/AbortControllerManager";

interface HomeState {
  homeData: HomeData;
  isHomeLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;
  fetchHome: (force?: boolean) => Promise<void>;
  setIsHomeLoading: (loading: boolean) => void;
  prepareRefresh: () => void;
  setError: (error: AppError | null) => void;
  reset: () => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  homeData: { recent: [] },
  isHomeLoading: false,
  isRefreshing: false,
  error: null,

  prepareRefresh: () => set({ homeData: { recent: [] }, isHomeLoading: true, isRefreshing: true, error: null }),

  fetchHome: async (force = false) => {
    const controller = abortManager.getController("home");

    // Serve cached data immediately to avoid loader flash
    if (!force) {
      try {
        const cached = await getDeps().animeService.peekHomeCache();
        if (cached) {
          set({ homeData: cached, isHomeLoading: false, isRefreshing: false, error: null });
          return;
        }
      } catch {
        // Ignore cache read error, proceed with normal fetch
      }
    }

    set({
      ...(force ? { homeData: { recent: [] } } : {}),
      isHomeLoading: true,
      isRefreshing: force,
      error: null
    });

    const result = await getDeps().animeService.fetchHomeData(controller.signal, force);

    const isSuccessful = !!result.data && result.data.recent.length > 0;

    const newState: Partial<HomeState> = {
      isHomeLoading: false,
      isRefreshing: force && !isSuccessful && !result.error,
      error: result.error
    };

    if (result.fromCache) {
      newState.homeData = result.data!;
    } else if (result.error) {
      newState.error = result.error;
    } else if (result.data) {
      newState.homeData = result.data;
    } else if (!isSuccessful) {
      // If no data, keep old data or reset? Let's keep old if available, or reset to empty
      newState.homeData = { recent: [] };
    }

    set(newState);
  },

  setIsHomeLoading: (loading) => set({ isHomeLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set({ homeData: { recent: [] }, error: null, isHomeLoading: false, isRefreshing: false }),
}));
