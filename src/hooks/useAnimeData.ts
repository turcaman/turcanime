import { useEffect, useState } from "react";
import { useDetailsStore } from "../stores/detailsStore";

export function useAnimeData(slug: string) {
  const anime = useDetailsStore((s) => s.activeAnime);
  const isLoading = useDetailsStore((s) => s.isDetailsLoading);
  const fetchDetails = useDetailsStore((s) => s.fetchDetails);
  const error = useDetailsStore((s) => s.error);
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
    anime,
    isLoading,
    error,
    hasLoaded,
    refresh: () => void fetchDetails(slug, true),
  };
}
