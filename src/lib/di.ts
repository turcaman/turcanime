/**
 * Dependency Injection container — the ONLY place where concrete
 * infrastructure implementations are wired together.
 *
 * Stores and use-cases import `getDeps()` instead of reaching into
 * infrastructure modules directly, enabling testability via mock injection.
 */
import { AnimeService } from "./application/services/animeService";
import { PlayerService } from "./application/services/playerService";
import { PlayerUIService } from "./application/services/PlayerUIService";
import { storage } from "./core/infrastructure";
import { getProvider } from "./core/providerRegistry";
import type { IContentProvider, IStorage } from "./domain/interfaces";
import { CacheRepo } from "./domain/repositories/cacheRepo";
import { ImageService } from "./infrastructure/services/ImageService";

export interface AppDependencies {
  storage: IStorage;
  getProvider: typeof getProvider;
  animeService: AnimeService;
  playerService: PlayerService;
  playerUIService: PlayerUIService;
  imageService: ImageService;
  cacheRepo: CacheRepo;
}

let deps: AppDependencies | null = null;
let initPromise: Promise<void> | null = null;
let isInitializing = false;

/**
 * Initialize the DI container with concrete implementations.
 * Returns a promise that resolves when the provider is set.
 */
export function initializeDeps(): { deps: AppDependencies; ready: Promise<void> } {
  if (deps) {
    return { deps, ready: Promise.resolve() };
  }

  if (isInitializing) {
    return { deps: deps!, ready: initPromise! };
  }

  isInitializing = true;

  const cacheRepo = new CacheRepo(storage);
  const imageService = new ImageService();

  deps = {
    storage,
    getProvider,
    animeService: new AnimeService(cacheRepo, getProvider as () => IContentProvider, imageService),
    playerService: new PlayerService(cacheRepo, getProvider as () => IContentProvider),
    playerUIService: new PlayerUIService(),
    imageService,
    cacheRepo,
  };

  initPromise = Promise.resolve().finally(() => {
    isInitializing = false;
  });

  return { deps, ready: initPromise };
}

/**
 * Retrieve the initialized dependencies.
 * If not yet initialized, lazily bootstraps with concrete implementations.
 * This ensures stores can be imported in any order without requiring explicit
 * `initializeDeps()` before first use.
 */
export function getDeps(): AppDependencies {
  if (!deps) {
    // Lazy bootstrap — allows stores to be safe even if imported before _layout
    initializeDeps();
  }
  return deps!;
}
