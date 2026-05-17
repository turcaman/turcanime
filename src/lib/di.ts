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
import { getProvider, setProvider } from "./core/providerRegistry";
import { ISessionManager, IStorage, IWebViewBridge } from "./domain/interfaces";
import { CacheRepo } from "./domain/repositories/cacheRepo";
import { AnimeLatinoProvider } from "./infrastructure/providers/AnimeLatinoProvider";
import { HtmlParser } from "./infrastructure/parsers/HtmlParser";
import { RscParser } from "./infrastructure/parsers/RscParser";
import { SiteVersionManager } from "./infrastructure/version/SiteVersionManager";
import { MetricsTracker } from "./infrastructure/metrics/MetricsTracker";
import { ImageService } from "./infrastructure/services/ImageService";
import { ANIMELATINO_CONFIG } from "./config/providerConfigs";
import { logger } from "./utils/logger";

// ─── Dependencies interface ────────────────────────────────────────────

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

  const cacheRepo = new CacheRepo(storage);
  const htmlParser = new HtmlParser();
  const rscParser = new RscParser();
  const versionManager = new SiteVersionManager(sessionManager, cacheRepo);
  const metrics = new MetricsTracker(cacheRepo);

  deps = {
    storage,
    webViewBridge,
    sessionManager,
    getProvider,
    animeService: new AnimeService(cacheRepo),
    playerService: new PlayerService(cacheRepo),
    playerUIService: new PlayerUIService(),
    imageService: new ImageService(),
    cacheRepo,
  };

  const provider = new AnimeLatinoProvider(
    sessionManager,
    cacheRepo,
    ANIMELATINO_CONFIG.baseUrl,
    htmlParser,
    rscParser,
    versionManager,
    metrics,
  );
  setProvider(provider);

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
