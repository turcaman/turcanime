import { create } from "zustand";
import { source } from "../services/source";
import { loadCached } from "../utils/cache";
import { withAuthRetry } from "../utils/retry";
import { ResourceRunner, resourceInitialState, type ResourceState } from "../utils/resource";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/cache";
import type { HomeData } from "../types";

export const HOME_KEY = "home";

interface HomeState {
  resource: ResourceState<HomeData>;
  fetchHome: (force?: boolean) => Promise<void>;
}

export const useHomeStore = create<HomeState>((set, get) => {
  const runner = new ResourceRunner<HomeData>({
    tag: "home",
    get: () => get().resource,
    set: (resource) => set({ resource }),
  });

  return {
    resource: resourceInitialState<HomeData>(),

    fetchHome: async (force = false) => {
      await runner.load(HOME_KEY, (signal) =>
        withAuthRetry(
          (attempt) =>
            loadCached(
              CACHE_PREFIXES.HOME,
              (sig) => source.getHomeData({ signal: sig }),
              {
                ttl: CACHE_TTL.HOME,
                signal,
                force: attempt > 0 ? true : force,
                isValid: (d) => d.recent.length > 0,
              },
            ),
          {
            signal,
            maxRetries: 2,
            // The fresh challenge may still land after a failed refresh
            continueAfterRefreshFailure: true,
            tag: "home",
          },
        ),
      );
    },
  };
});
