import { create } from "zustand";
import { getDeps } from "../di";
import type { AnimeDetail, AppError } from "../domain/entities";

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
    const result = await getDeps().animeService.fetchDetailsData(slug, signal, force);

    if (signal.aborted) return;

    if (result.error) {
      set({ error: result.error, isDetailsLoading: false });
    } else {
      set({ activeAnime: result.data ?? null, isDetailsLoading: false, error: null });
    }
  },

  reset: () => { set({ activeAnime: null, error: null, isDetailsLoading: false }); },
  setError: (error) => { set({ error }); },
}));
