import { useEffect, useState } from "react";
import type { AnimeDetail, AppError } from "../types";
import { useDetailsStore } from "../stores/detailsStore";

export function useAnimeData(slug: string) {
  const { activeAnime: anime, isDetailsLoading: isLoading, fetchDetails, error } = useDetailsStore();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!anime || anime.url !== slug) {
      void fetchDetails(slug);
    }
  }, [slug, fetchDetails, anime]);

  useEffect(() => {
    if (anime) setHasLoaded(true);
  }, [anime]);

  return {
    anime: anime as AnimeDetail | null,
    isLoading,
    error: error as AppError | null,
    hasLoaded,
    refresh: () => void fetchDetails(slug, true),
  };
}
