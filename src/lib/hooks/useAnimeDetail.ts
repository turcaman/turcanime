import { useCallback, useEffect, useRef, useState } from "react";
import { getDeps } from "../di";
import type { Episode } from "../domain/entities";
import {
    buildRanges,
    getVisibleEpisodes,
    orderEpisodes,
} from "../domain/services/episodeService";
import { logger } from "../utils/logger";

export function usePersistedRange(slug: string | undefined) {
  const [activeRangeIdx, setActiveRangeIdx] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true);
  const currentSlugRef = useRef(slug);

  useEffect(() => {
    if (slug !== currentSlugRef.current) {
      currentSlugRef.current = slug;
      setActiveRangeIdx(0);
      setIsRestoring(true);
    }
  }, [slug]);

  useEffect(() => {
    if (slug == null) {
      setIsRestoring(false);
      return;
    }
    getDeps().storage.get<number>(`range_${slug}`)
      .then((idx) => {
        setActiveRangeIdx(idx ?? 0);
        setIsRestoring(false);
      })
      .catch((error) => {
        logger.error("usePersistedRange", "Failed to load persisted range", error);
        setActiveRangeIdx(0);
        setIsRestoring(false);
      });
  }, [slug]);

  const setAndPersist = useCallback(
    (idx: number) => {
      setActiveRangeIdx(idx);
      if (slug != null) {
        getDeps().storage.set(`range_${slug}`, idx).catch((error) => {
          logger.error("usePersistedRange", "Failed to persist range", error);
        });
      }
    },
    [slug],
  );

  return [activeRangeIdx, setAndPersist, isRestoring] as const;
}

interface UseEpisodePaginationResult {
  orderedEpisodes: Episode[];
  ranges: { label: string; start: number; end: number }[];
  visibleEpisodes: Episode[];
}

export function useEpisodePagination(
  episodes: Episode[] | undefined,
  order: "asc" | "desc",
  activeRangeIdx: number,
): UseEpisodePaginationResult {
  const isAscending = order === "asc";

  const orderedEpisodes = episodes != null && episodes.length > 0 ? orderEpisodes(episodes) : [];
  const ranges = buildRanges(orderedEpisodes);
  const visibleEpisodes = getVisibleEpisodes(orderedEpisodes, ranges, activeRangeIdx, isAscending);

  return { orderedEpisodes, ranges, visibleEpisodes };
}

export function useServerFetcher(
  slug: string | undefined,
  fetchServers: (slug: string, number: string, force: boolean, signal?: AbortSignal) => Promise<void>,
) {
  const [serverLoading, setServerLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const fetchAndSet = useCallback(
    async (ep: Episode) => {
      if (slug == null) return;

      const currentRequestId = ++requestIdRef.current;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setServerLoading(true);
      try {
        await fetchServers(slug, ep.number, false, abortControllerRef.current.signal);
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return;
      } finally {
        // Only stop loading if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          setServerLoading(false);
        }
      }
    },
    [slug, fetchServers],
  );

  return { serverLoading, fetchAndSet };
}
