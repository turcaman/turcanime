import { useEffect, useState } from "react";
import type { AnimeDetail, AppError } from "../domain/entities";
import { useDetailsStore } from "../store/detailsStore";

interface UseAnimeDataResult {
  anime: AnimeDetail | null;
  isLoading: boolean;
  error: AppError | null;
  hasLoaded: boolean;
  refresh: () => void;
}

export function useAnimeData(slug: string): UseAnimeDataResult {
  const {
    activeAnime: anime,
    isDetailsLoading: isLoading,
    fetchDetails,
    error,
  } = useDetailsStore();

  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!anime || anime.url !== slug) {
      void fetchDetails(slug);
    }
  }, [slug, fetchDetails, anime]);

  useEffect(() => {
    if (anime) setHasLoaded(true);
  }, [anime]);

  const refresh = () => {
    void fetchDetails(slug, true);
  };

  return {
    anime,
    isLoading,
    error,
    hasLoaded,
    refresh,
  };
}
