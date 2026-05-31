import { create } from "zustand";
import { getDeps } from "../di";
import type { AnimeDetail, AppError } from "../domain/entities";
import { abortManager } from "../utils/AbortControllerManager";

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
    const controller = abortManager.getController("details");
    set({ isDetailsLoading: true, error: null });

    const result = await getDeps().animeService.fetchDetailsData(slug, controller.signal, force);

    if (result.error) {
      set({ error: result.error, isDetailsLoading: false });
    } else {
      set({ activeAnime: result.data || null, isDetailsLoading: false, error: null });
    }
  },

  reset: () => set({ activeAnime: null, error: null, isDetailsLoading: false }),
  setError: (error) => set({ error }),
}));
