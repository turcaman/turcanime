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
import { refreshSession, sessionManager, storage } from "./core/infrastructure";
import { getProvider, setProvider } from "./core/providerRegistry";
import type { ISessionManager, IStorage } from "./domain/interfaces";
import { CacheRepo } from "./domain/repositories/cacheRepo";
import { AnimeLatinoProvider } from "./infrastructure/providers/AnimeLatinoProvider";
import { HtmlParser } from "./infrastructure/parsers/HtmlParser";
import { RscParser } from "./infrastructure/parsers/RscParser";
import { AnimeOrchestrator } from "./infrastructure/parsers/AnimeOrchestrator";
import { SiteVersionManager } from "./infrastructure/version/SiteVersionManager";
import { MetricsTracker } from "./infrastructure/metrics/MetricsTracker";
import { ImageService } from "./infrastructure/services/ImageService";
import { ANIMELATINO_CONFIG } from "./config/providerConfigs";
import { logger } from "./utils/logger";

export interface AppDependencies {
  storage: IStorage;
  sessionManager: ISessionManager;
  getProvider: typeof getProvider;
  animeService: AnimeService;
  playerService: PlayerService;
  playerUIService: PlayerUIService;
  imageService: ImageService;
  cacheRepo: CacheRepo;
  refreshSession: () => Promise<void>;
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
  const htmlParser = new HtmlParser();
  const rscParser = new RscParser();
  const orchestrator = new AnimeOrchestrator(htmlParser, rscParser);
  const versionManager = new SiteVersionManager(sessionManager, cacheRepo);
  const metrics = new MetricsTracker(cacheRepo);
  const imageService = new ImageService();

  deps = {
    storage,
    sessionManager,
    getProvider,
    animeService: new AnimeService(cacheRepo, getProvider, sessionManager, imageService),
    playerService: new PlayerService(cacheRepo, getProvider),
    playerUIService: new PlayerUIService(),
    imageService,
    cacheRepo,
    refreshSession,
  };

  const provider = new AnimeLatinoProvider(
    sessionManager,
    ANIMELATINO_CONFIG.baseUrl,
    orchestrator,
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
