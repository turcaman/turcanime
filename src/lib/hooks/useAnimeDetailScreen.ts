import { useCallback, useEffect, useRef, useState } from "react";
import { Episode } from "../domain/entities";
import { useAnimeStore } from "../store/animeStore";
import { usePlayerStore } from "../store/playerStore";
import { useUserStore } from "../store/userStore";
import {
    useEpisodePagination,
    usePersistedRange,
    useServerFetcher,
} from "./useAnimeDetail";

export function useAnimeDetailScreen(slug: string) {
  const {
    activeAnime: anime,
    isDetailsLoading: isAnimeLoading,
    fetchDetails,
    error,
  } = useAnimeStore();
  const { resolveStream, servers, fetchServers } = usePlayerStore();
  const { episodeOrder, setEpisodeOrder } = useUserStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const hasLoadedRef = useRef(false);

  const [activeRangeIdx, setActiveRangeIdx, isRestoring] = usePersistedRange(slug);
  const { ranges, visibleEpisodes } = useEpisodePagination(
    anime?.episodes,
    episodeOrder,
    activeRangeIdx,
  );
  const { serverLoading, fetchAndSet } = useServerFetcher(slug, fetchServers);

  useEffect(() => {
    let cancelled = false;
    // Only fetch if we don't already have data for this slug
    if (!anime || anime.url !== slug) {
      fetchDetails(slug).then(() => {
        if (!cancelled) {
          // Details loaded successfully
        }
      }).catch((error) => {
        console.error('[useAnimeDetailScreen] Failed to fetch details:', error);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [slug, fetchDetails, anime]);

  useEffect(() => {
    if (anime) hasLoadedRef.current = true;
  }, [anime]);

  const handleEpisodePress = useCallback(
    (ep: Episode) => {
      setSelectedEpisode(ep);
      fetchAndSet(ep);
    },
    [fetchAndSet],
  );

  const handleRefresh = useCallback(() => {
    fetchDetails(slug, true);
  }, [slug, fetchDetails]);

  const isAscending = episodeOrder === "asc";

  return {
    anime,
    isAnimeLoading,
    error,
    servers,
    serverLoading,
    episodeOrder,
    setEpisodeOrder,
    isExpanded,
    setIsExpanded,
    selectedEpisode,
    setSelectedEpisode,
    hasLoadedRef,
    activeRangeIdx,
    setActiveRangeIdx,
    isRestoring,
    ranges,
    visibleEpisodes,
    isAscending,
    handleEpisodePress,
    handleRefresh,
    resolveStream,
    fetchAndSet,
  };
}
