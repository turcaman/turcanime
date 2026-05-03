/**
 * Dependency Injection container — the ONLY place where concrete
 * infrastructure implementations are wired together.
 *
 * Stores and use-cases import `getDeps()` instead of reaching into
 * infrastructure modules directly, enabling testability via mock injection.
 */
import { NavigationService } from "./application/services/NavigationService";
import { PlayerUIService } from "./application/services/PlayerUIService";
import { sessionManager, storage, webViewBridge } from "./core/infrastructure";
import { getProvider, initProvider } from "./core/providerRegistry";
import { ISessionManager, IStorage, IWebViewBridge } from "./domain/interfaces";
import { CacheRepo } from "./domain/repositories/cacheRepo";
import { ImageService } from "./infrastructure/services/ImageService";
import { logger } from "./utils/logger";

// ─── Dependencies interface ────────────────────────────────────────────

export interface AppDependencies {
  storage: IStorage;
  webViewBridge: IWebViewBridge;
  sessionManager: ISessionManager;
  getProvider: typeof getProvider;
  navigationService: NavigationService;
  playerUIService: PlayerUIService;
  imageService: ImageService;
  cacheRepo: CacheRepo;
}

// ─── Singleton instance ────────────────────────────────────────────────

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

  deps = {
    storage,
    webViewBridge,
    sessionManager,
    getProvider,
    navigationService: new NavigationService(),
    playerUIService: new PlayerUIService(),
    imageService: new ImageService(),
    cacheRepo: new CacheRepo(storage),
  };

  initPromise = Promise.resolve().then(async () => {
    // Initialize logger with storage before anything else
    logger.setStorage(storage);
    await sessionManager.initialize();
    initProvider();
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
