import { useCallback, useMemo } from "react";
import type { Episode } from "../types";
import { usePlayerStore } from "../stores/playerStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useAnimeData } from "./useAnimeData";
import { usePersistedRange, useServerFetcher } from "./useAnimeDetail";
import { useEpisodeUI } from "./useEpisodeUI";
import { computeEpisodePagination } from "./episodeHelpers";

export function useAnimeDetailScreen(slug: string) {
  const { anime, isLoading: isAnimeLoading, error, hasLoaded, refresh } = useAnimeData(slug);
  const { resolveStream, servers, fetchServers } = usePlayerStore();
  const { episodeOrder, setEpisodeOrder } = useSettingsStore();
  const episodeUI = useEpisodeUI();

  const [activeRangeIdx, setActiveRangeIdx, isRestoring] = usePersistedRange(slug);
  const { ranges, visibleEpisodes } = useMemo(
    () => computeEpisodePagination(anime?.episodes, episodeOrder, activeRangeIdx),
    [anime?.episodes, episodeOrder, activeRangeIdx],
  );
  const { serverLoading, fetchAndSet } = useServerFetcher(slug, fetchServers);

  const handleEpisodePress = useCallback(
    (ep: Episode) => {
      episodeUI.selectEpisode(ep);
      void fetchAndSet(ep);
    },
    [fetchAndSet, episodeUI],
  );

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
    isAscending: episodeOrder === "asc",
    activeRangeIdx,
    setActiveRangeIdx,
    isRestoring,
    ranges,
    visibleEpisodes,
    handleEpisodePress,
    ...episodeUI,
  };
}
