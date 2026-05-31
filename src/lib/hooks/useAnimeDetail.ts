/**
 * Custom hooks for the anime detail screen.
 * Extracts pagination, persistence, and server-fetching logic
 * from the component to keep it focused on rendering.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getDeps } from "../di";
import type { Episode } from "../domain/entities";
import {
    buildRanges,
    getVisibleEpisodes,
    orderEpisodes,
} from "../domain/services/episodeService";
import { logger } from "../utils/logger";

// ─── Persisted active range index ──────────────────────────────────────

/**
 * Persist the active episode range index per anime slug.
 * Returns `[activeRangeIdx, setActiveRangeIdx]` synced with getDeps().storage.
 */
export function usePersistedRange(slug: string | undefined) {
  const [activeRangeIdx, setActiveRangeIdx] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true);
  const currentSlugRef = useRef(slug);

  // Reset when navigating to a different anime
  useEffect(() => {
    if (slug !== currentSlugRef.current) {
      currentSlugRef.current = slug;
      setActiveRangeIdx(0);
      setIsRestoring(true);
    }
  }, [slug]);

  // Load persisted index on mount / slug change
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

// ─── Episode pagination (order → ranges → visible slice) ───────────────

interface UseEpisodePaginationResult {
  orderedEpisodes: Episode[];
  ranges: { label: string; start: number; end: number }[];
  visibleEpisodes: Episode[];
}

/**
 * Computes ordered episodes, builds ranges, and returns the visible slice
 * for the current active range and sort order.
 */
export function useEpisodePagination(
  episodes: Episode[] | undefined,
  order: "asc" | "desc",
  activeRangeIdx: number,
): UseEpisodePaginationResult {
  const isAscending = order === "asc";

  // Computaciones baratas - no necesitan useMemo
  const orderedEpisodes = episodes != null && episodes.length > 0 ? orderEpisodes(episodes) : [];
  const ranges = buildRanges(orderedEpisodes);
  const visibleEpisodes = getVisibleEpisodes(orderedEpisodes, ranges, activeRangeIdx, isAscending);

  return { orderedEpisodes, ranges, visibleEpisodes };
}

// ─── Server fetch with loading state ───────────────────────────────────

/**
 * Fetches servers for a given episode and manages a local loading flag.
 * Returns `{ serverLoading, fetchAndSet }`.
 * The component should read `servers` from usePlayerStore directly.
 */
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

      // Increment request ID to track which request is current
      const currentRequestId = ++requestIdRef.current;

      // Cancel previous request
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
