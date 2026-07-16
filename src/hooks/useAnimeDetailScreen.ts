import { useCallback, useMemo } from "react";
import type { Episode, VideoServer } from "../types";
import { usePlayerStore } from "../stores/playerStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useHistoryStore } from "../stores/historyStore";
import { useAnimeData } from "./useAnimeData";
import { usePersistedRange, useServerFetcher } from "./useAnimeDetail";
import { useEpisodeUI } from "./useEpisodeUI";
import { computeEpisodePagination } from "./episodeHelpers";
import { navigateToPlayer } from "../utils/navigation";

export function useAnimeDetailScreen(slug: string) {
  const { anime, isLoading: isAnimeLoading, error, hasLoaded, refresh } = useAnimeData(slug);
  const resolveStream = usePlayerStore((s) => s.resolveStream);
  const servers = usePlayerStore((s) => s.servers);
  const fetchServers = usePlayerStore((s) => s.fetchServers);
  const episodeOrder = useSettingsStore((s) => s.episodeOrder);
  const setEpisodeOrder = useSettingsStore((s) => s.setEpisodeOrder);
  const addToHistory = useHistoryStore((s) => s.addToHistory);
  const watched = useHistoryStore((s) => s.watched);
  const toggleWatched = useHistoryStore((s) => s.toggleWatched);
  const episodeUI = useEpisodeUI();
  const { selectedEpisode, setSelectedEpisode } = episodeUI;

  const [activeRangeIdx, setActiveRangeIdx, isRestoring] = usePersistedRange(slug);
  const { ranges, visibleEpisodes } = useMemo(
    () => computeEpisodePagination(anime?.episodes, episodeOrder, activeRangeIdx),
    [anime?.episodes, episodeOrder, activeRangeIdx],
  );
  const { serverLoading, fetchAndSet } = useServerFetcher(slug, fetchServers);

  const watchedSet = useMemo(() => new Set(watched), [watched]);

  const handleEpisodePress = useCallback(
    (ep: Episode) => {
      episodeUI.selectEpisode(ep);
      void fetchAndSet(ep);
    },
    [fetchAndSet, episodeUI],
  );

  const handleServerSelect = useCallback(
    (server: VideoServer) => {
      if (!selectedEpisode || !anime) return;
      void resolveStream(server, selectedEpisode.url);
      setSelectedEpisode(null);
      const existing = useHistoryStore.getState().lastViewed.find(
        (h) => h.url === slug && h.number === selectedEpisode.number,
      );
      addToHistory({
        title: anime.title,
        image: anime.image,
        url: slug,
        number: selectedEpisode.number,
        progress: existing?.progress,
        duration: existing?.duration,
        timestamp: Date.now(),
      }).catch(() => {});
      navigateToPlayer({
        slug,
        number: selectedEpisode.number,
        title: anime.title,
        image: anime.image,
      });
    },
    [selectedEpisode, anime, slug, resolveStream, setSelectedEpisode, addToHistory],
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
    handleServerSelect,
    watchedSet,
    toggleWatched,
    ...episodeUI,
  };
}
