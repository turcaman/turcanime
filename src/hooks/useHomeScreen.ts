import { useEffect, useMemo } from "react";
import type { Anime, HistoryItem } from "../types";
import { useHomeStore } from "../stores/homeStore";
import { useHistoryStore } from "../stores/historyStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useUserInitializationStore } from "../stores/userIndex";

export type SectionItem =
  | { type: "CONTINUE"; items: HistoryItem[] }
  | { type: "SECTION"; label: string; items: Anime[] };

export function useHomeScreen() {
  const fetchHome = useHomeStore((s) => s.fetchHome);
  const homeData = useHomeStore((s) => s.homeData);
  const isHomeLoading = useHomeStore((s) => s.isHomeLoading);
  const isRefreshing = useHomeStore((s) => s.isRefreshing);
  const error = useHomeStore((s) => s.error);

  const continueWatching = useHistoryStore((s) => s.continueWatching);
  const cacheInvalidationTimestamp = useSettingsStore((s) => s.cacheInvalidationTimestamp);
  const isInitialized = useUserInitializationStore((s) => s.isInitialized);

  useEffect(() => {
    if (cacheInvalidationTimestamp > 0) {
      void fetchHome();
    }
  }, [cacheInvalidationTimestamp, fetchHome]);

  const sections = useMemo((): SectionItem[] => {
    const list: SectionItem[] = [];
    if (continueWatching.length > 0) {
      list.push({ type: "CONTINUE", items: continueWatching });
    }
    if (homeData.recent && homeData.recent.length > 0) {
      list.push({ type: "SECTION", label: "Recién agregados", items: homeData.recent });
    }
    return list;
  }, [homeData, continueWatching]);

  return {
    sections,
    isLoading: isHomeLoading || (isRefreshing && homeData.recent.length === 0) || !isInitialized,
    error,
    fetchHome,
    hasContent: sections.length > 0,
  };
}
