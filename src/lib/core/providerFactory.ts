/**
 * Provider Factory — Manages content providers.
 * Follows the Open/Closed Principle: add new providers without modifying this file.
 */
import { IContentProvider, ISessionManager } from "../domain/interfaces";
import { CacheRepo } from "../domain/repositories/cacheRepo";

type ProviderConstructor = new (sessionManager: ISessionManager, cacheRepo: CacheRepo) => IContentProvider;

const registry = new Map<string, ProviderConstructor>();

/**
 * Register a provider constructor.
 * Call this at module load time (e.g., at the bottom of your provider file).
 */
export function registerProvider(id: string, ctor: ProviderConstructor): void {
  registry.set(id, ctor);
}

/**
 * Create a provider instance.
 * Throws if no provider is registered for that id.
 */
export function createProvider(id: string, sessionManager: ISessionManager, cacheRepo: CacheRepo): IContentProvider {
  const ctor = registry.get(id);
  if (!ctor) {
    const available = Array.from(registry.keys()).join(", ");
    throw new Error(
      `No provider registered for id "${id}". Available providers: ${available || "(none)"}`
    );
  }
  return new ctor(sessionManager, cacheRepo);
}

/**
 * Check if a provider is registered.
 */
export function hasProvider(id: string): boolean {
  return registry.has(id);
}

/**
 * Get all registered provider IDs.
 */
export function getRegisteredModes(): string[] {
  return Array.from(registry.keys());
}
