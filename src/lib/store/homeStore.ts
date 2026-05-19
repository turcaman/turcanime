import { create } from "zustand";
import { getDeps } from "../di";
import { AppError, HomeData } from "../domain/entities";
import { abortManager } from "../utils/AbortControllerManager";

interface HomeState {
  homeData: HomeData;
  isHomeLoading: boolean;
  error: AppError | null;
  fetchHome: (force?: boolean) => Promise<void>;
  setIsHomeLoading: (loading: boolean) => void;
  setError: (error: AppError | null) => void;
  reset: () => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  homeData: { recent: [] },
  isHomeLoading: false,
  error: null,

  fetchHome: async (force = false) => {
    const controller = abortManager.getController("home");

    // Serve cached data immediately to avoid loader flash
    if (!force) {
      try {
        const cached = await getDeps().animeService.peekHomeCache();
        if (cached) {
          set({ homeData: cached, isHomeLoading: false, error: null });
          return;
        }
      } catch {
        // Ignore cache read error, proceed with normal fetch
      }
    }

    set({ isHomeLoading: true, error: null });

    const result = await getDeps().animeService.fetchHomeData(controller.signal, force);

    if (result.fromCache) {
      set({ homeData: result.data!, isHomeLoading: false, error: null });
    } else if (result.error) {
      set({ error: result.error, isHomeLoading: false });
    } else if (result.data) {
      set({ homeData: result.data, isHomeLoading: false, error: null });
    } else {
      // Aborted or empty result — don't show error, next fetch will populate
      set({ isHomeLoading: false });
    }
  },

  setIsHomeLoading: (loading) => set({ isHomeLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set({ homeData: { recent: [] }, error: null, isHomeLoading: false }),
}));
