/**
 * Dependency Injection container — the ONLY place where concrete
 * infrastructure implementations are wired together.
 *
 * Stores and use-cases import `getDeps()` instead of reaching into
 * infrastructure modules directly, enabling testability via mock injection.
 */
import { sessionManager, storage, webViewBridge } from "./core/infrastructure";
import { getProvider, initProviderForMode } from "./core/providerRegistry";
import { ISessionManager, IStorage, IWebViewBridge } from "./domain/interfaces";
import { CacheRepo } from "./domain/repositories/cacheRepo";
import { logger } from "./utils/logger";

// ─── Dependencies interface ────────────────────────────────────────────

export interface AppDependencies {
  storage: IStorage;
  webViewBridge: IWebViewBridge;
  sessionManager: ISessionManager;
  getProvider: typeof getProvider;
}

// ─── Singleton instance ────────────────────────────────────────────────

let deps: AppDependencies | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the DI container with concrete implementations.
 * Returns a promise that resolves when the provider is set.
 */
export function initializeDeps(): { deps: AppDependencies; ready: Promise<void> } {
  if (deps) {
    return { deps, ready: Promise.resolve() };
  }

  deps = {
    storage,
    webViewBridge,
    sessionManager,
    getProvider,
  };

  initPromise = Promise.resolve().then(async () => {
    // Initialize logger with storage before anything else
    logger.setStorage(storage);
    // Initialize CacheRepo singleton before creating providers
    CacheRepo.getInstance(storage);
    await sessionManager.initialize();
    initProviderForMode("safe");
    await initProviderForMode("unsafe");
  }).catch(e => {
    console.error("[DI] Initialization failed:", e);
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
    deps = {
      storage,
      webViewBridge,
      sessionManager,
      getProvider,
    };
  }
  return deps;
}

/**
 * Replace dependencies with mocks (for testing).
 */
export function setDepsForTesting(mockDeps: AppDependencies): void {
  deps = mockDeps;
}
