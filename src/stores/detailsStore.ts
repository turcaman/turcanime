import { create } from "zustand";
import { source } from "../services/source";
import { loadCached } from "../utils/cache";
import { withAuthRetry } from "../utils/retry";
import { SourceError } from "../utils/errors";
import { ResourceRunner, resourceInitialState, type ResourceState } from "../utils/resource";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/cache";
import type { AnimeDetail } from "../types";

interface DetailsState {
  resource: ResourceState<AnimeDetail>;
  fetchDetails: (slug: string, force?: boolean) => Promise<void>;
}

export const useDetailsStore = create<DetailsState>((set, get) => {
  const runner = new ResourceRunner<AnimeDetail>({
    tag: "details",
    get: () => get().resource,
    set: (resource) => set({ resource }),
  });

  return {
    resource: resourceInitialState<AnimeDetail>(),

    fetchDetails: async (slug: string, force = false) => {
      const cacheKey = `${CACHE_PREFIXES.ANIME}_${slug}`;
      await runner.load(slug, (signal) =>
        withAuthRetry(
          (attempt) =>
            loadCached(
              cacheKey,
              async (s) => {
                const detail = await source.getDetails(slug, { signal: s });
                // 404: a real, final failure — never cached, never fabricated
                if (detail == null) throw new SourceError(`Contenido no encontrado: ${slug}`, "UNKNOWN");
                return detail;
              },
              {
                ttl: CACHE_TTL.DETAILS,
                signal,
                force: attempt > 0 ? true : force,
                // empty episode list is a valid answer, not a failed fetch
                isValid: () => true,
              },
            ),
          { signal, maxRetries: 2, tag: "details" },
        ),
      );
    },
  };
});
