import { useCallback, useEffect, useRef, useState } from "react";
import { storage } from "../utils/storage";
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

