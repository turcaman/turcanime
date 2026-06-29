import { create } from "zustand";
import { getDeps } from "../di";
import type { AppError, HomeData } from "../domain/entities";

let homeController: AbortController | null = null;

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

  prepareRefresh: () => { set({ homeData: { recent: [] }, isHomeLoading: true, isRefreshing: true, error: null }); },

  fetchHome: async (force = false) => {
    if (homeController) homeController.abort();
    homeController = new AbortController();
    const signal = homeController.signal;

    set({
      ...(force ? { homeData: { recent: [] } } : {}),
      isHomeLoading: true,
      isRefreshing: force,
      error: null
    });

    const result = await getDeps().animeService.fetchHomeData(signal, force);

    if (signal.aborted) return;

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
      newState.homeData = { recent: [] };
    }

    set(newState);
  },

  setIsHomeLoading: (loading) => { set({ isHomeLoading: loading }); },
  setError: (error) => { set({ error }); },
  reset: () => { set({ homeData: { recent: [] }, error: null, isHomeLoading: false, isRefreshing: false }); },
}));
