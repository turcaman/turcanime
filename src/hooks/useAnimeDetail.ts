import { useCallback, useEffect, useRef, useState } from "react";
import { storage } from "../utils/storage";
import { logger } from "../utils/logger";
import type { Episode } from "../types";

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
    storage
      .get<number>(`range_${slug}`)
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
        storage.set(`range_${slug}`, idx).catch((error) => {
          logger.error("usePersistedRange", "Failed to persist range", error);
        });
      }
    },
    [slug],
  );

  return [activeRangeIdx, setAndPersist, isRestoring] as const;
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
        if (e instanceof Error && e.name === "AbortError") return;
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setServerLoading(false);
        }
      }
    },
    [slug, fetchServers],
  );

  return { serverLoading, fetchAndSet };
}
