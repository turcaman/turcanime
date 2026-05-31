import { useCallback } from "react";
import type { Episode } from "../domain/entities";
import { usePlayerStore } from "../store/playerStore";
import { useSettingsStore } from "../store/user";
import { useAnimeData } from "./useAnimeData";
import {
    useEpisodePagination,
    usePersistedRange,
    useServerFetcher,
} from "./useAnimeDetail";
import { useEpisodeUI } from "./useEpisodeUI";

export function useAnimeDetailScreen(slug: string) {
  const { anime, isLoading: isAnimeLoading, error, hasLoaded, refresh } = useAnimeData(slug);
  const { resolveStream, servers, fetchServers } = usePlayerStore();
  const { episodeOrder, setEpisodeOrder } = useSettingsStore();
  const episodeUI = useEpisodeUI();

  const [activeRangeIdx, setActiveRangeIdx, isRestoring] = usePersistedRange(slug);
  const { ranges, visibleEpisodes } = useEpisodePagination(
    anime?.episodes,
    episodeOrder,
    activeRangeIdx,
  );
  const { serverLoading, fetchAndSet } = useServerFetcher(slug, fetchServers);

  const handleEpisodePress = useCallback(
    (ep: Episode) => {
      episodeUI.selectEpisode(ep);
      void fetchAndSet(ep);
    },
    [fetchAndSet, episodeUI],
  );

  const isAscending = episodeOrder === "asc";

  return {
    anime,
    isAnimeLoading,
    error,
    hasLoaded,
    refresh,
    servers,
    serverLoading,
    resolveStream,
    episodeOrder,
    setEpisodeOrder,
    isAscending,
    activeRangeIdx,
    setActiveRangeIdx,
    isRestoring,
    ranges,
    visibleEpisodes,
    handleEpisodePress,
    ...episodeUI,
  };
}
