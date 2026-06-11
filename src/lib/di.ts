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
import { sessionManager, storage, webViewBridge } from "./core/infrastructure";
import { getProvider } from "./core/providerRegistry";
import type { ISessionManager, IStorage, IWebViewBridge } from "./domain/interfaces";
import { CacheRepo } from "./domain/repositories/cacheRepo";
import { ImageService } from "./infrastructure/services/ImageService";
import { logger } from "./utils/logger";

export interface AppDependencies {
  storage: IStorage;
  webViewBridge: IWebViewBridge;
  sessionManager: ISessionManager;
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
    webViewBridge,
    sessionManager,
    getProvider,
    animeService: new AnimeService(cacheRepo, getProvider, sessionManager, imageService),
    playerService: new PlayerService(cacheRepo, getProvider, webViewBridge),
    playerUIService: new PlayerUIService(),
    imageService,
    cacheRepo,
  };

  initPromise = Promise.resolve().then(async () => {
    logger.setStorage(storage);
    await sessionManager.initialize();
  }).catch(e => {
    logger.error("DI", "Initialization failed", e);
  }).finally(() => {
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
