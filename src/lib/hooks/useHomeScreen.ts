import { useMemo } from "react";
import { Anime, HistoryItem } from "../domain/entities";
import { useAnimeStore } from "../store/animeStore";
import { useUserStore } from "../store/userStore";

export type SectionItem =
  | { type: "HERO"; data: Anime }
  | { type: "CONTINUE"; items: HistoryItem[] }
  | { type: "SECTION"; label: string; items: Anime[] };

const SECTION_LABELS = {
  recent: "Recién agregados",
  popular: "Populares",
  topViewed: "Más vistos",
};

function buildSections(
  homeData: { popular?: Anime[]; recent?: Anime[]; topViewed?: Anime[] },
  continueWatchingItems: HistoryItem[]
): SectionItem[] {
  const heroSource = homeData.popular?.[0];

  return [
    ...(heroSource ? [{ type: "HERO" as const, data: heroSource }] : []),
    ...(continueWatchingItems.length > 0 ? [{ type: "CONTINUE" as const, items: continueWatchingItems }] : []),
    ...(homeData.recent && homeData.recent.length > 0 ? [{ type: "SECTION" as const, label: SECTION_LABELS.recent, items: homeData.recent }] : []),
    ...(homeData.popular && homeData.popular.length > 0 ? [{ type: "SECTION" as const, label: SECTION_LABELS.popular, items: homeData.popular }] : []),
    ...(homeData.topViewed && homeData.topViewed.length > 0 ? [{ type: "SECTION" as const, label: SECTION_LABELS.topViewed, items: homeData.topViewed }] : []),
  ];
}

export function useHomeScreen() {
  const { fetchHome, homeData, isHomeLoading, error } = useAnimeStore();
  const { getContinueWatching, isInitialized } = useUserStore();

  const sections = useMemo(() => {
    const continueWatchingItems = getContinueWatching();
    return buildSections(homeData, continueWatchingItems);
  }, [homeData, getContinueWatching])

  const isLoading = isHomeLoading || !isInitialized;

  return {
    sections,
    isLoading,
    error,
    fetchHome,
    hasContent: sections.length > 0,
  };
}
