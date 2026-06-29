/**
 * Generic cache repository with TTL support.
 * Wraps raw storage with typed get/set/expiration logic.
 */
import { LIMITS } from "../../config/limits";
import { logger } from "../../utils/logger";

export interface CacheEntry<T> {
  payload: T;
  expiration: number;
}

export interface ICacheRepo {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  remove(key: string): Promise<void>;
  clearWithPrefix(prefix: string): Promise<void>;
  clearAll(excludeKeys?: string[]): Promise<void>;
}

export class CacheRepo implements ICacheRepo {
  private storage: {
    get: <T>(key: string) => Promise<T | null>;
    set: <T>(key: string, value: T) => Promise<void>;
    remove: (key: string) => Promise<void>;
    getAllKeys: () => Promise<string[]>;
  };

  private readonly MAX_ENTRY_SIZE = LIMITS.CACHE_MAX_ENTRY_SIZE;
  private readonly MAX_ENTRIES = LIMITS.CACHE_MAX_ENTRIES;
  private trackedKeyCount = 0;
  private lastCleanupTime = 0;
  private static readonly CLEANUP_INTERVAL_MS = 60_000;

  constructor(storage: CacheRepo['storage']) {
    this.storage = storage;
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = await this.storage.get<CacheEntry<T>>(key);
    if (entry == null || typeof entry !== "object" || typeof entry.expiration !== "number") {
      if (entry != null) {
        await this.storage.remove(key);
        this.trackedKeyCount = Math.max(0, this.trackedKeyCount - 1);
      }
      return null;
    }
    if (Date.now() >= entry.expiration) {
      await this.storage.remove(key);
      this.trackedKeyCount = Math.max(0, this.trackedKeyCount - 1);
      return null;
    }
    return entry;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    try {
      const size = JSON.stringify(value).length;
      if (size > this.MAX_ENTRY_SIZE) {
        logger.warn("CacheRepo", `Entry "${key}" too large (${(size / 1024).toFixed(1)}KB), skipping cache`);
        return;
      }
    } catch {
    }

    const existing = await this.storage.get<CacheEntry<T>>(key);
    if (existing == null) {
      this.trackedKeyCount++;
    }
    const now = Date.now();
    if (this.trackedKeyCount >= this.MAX_ENTRIES && (now - this.lastCleanupTime) > CacheRepo.CLEANUP_INTERVAL_MS) {
      this.lastCleanupTime = now;
      try {
        const allKeys = await this.storage.getAllKeys();
        this.trackedKeyCount = allKeys.length;
        if (allKeys.length >= this.MAX_ENTRIES) {
          const toRemove = allKeys.slice(0, Math.floor(this.MAX_ENTRIES * LIMITS.CACHE_CLEANUP_PERCENTAGE));
          await Promise.all(toRemove.map((k) => this.storage.remove(k)));
          this.trackedKeyCount -= toRemove.length;
        }
      } catch {
      }
    }

    const entry: CacheEntry<T> = {
      payload: value,
      expiration: Date.now() + ttlMs,
    };
    await this.storage.set(key, entry);
  }

  async remove(key: string): Promise<void> {
    await this.storage.remove(key);
  }

  async clearWithPrefix(prefix: string): Promise<void> {
    const allKeys = await this.storage.getAllKeys();
    const matchingKeys = allKeys.filter((k) => k.startsWith(prefix));
    await Promise.all(matchingKeys.map((k) => this.storage.remove(k)));
    this.trackedKeyCount = Math.max(0, this.trackedKeyCount - matchingKeys.length);
  }

  async clearAll(excludeKeys: string[] = []): Promise<void> {
    const allKeys = await this.storage.getAllKeys();
    const keysToRemove = allKeys.filter((k) => !excludeKeys.includes(k));
    await Promise.all(keysToRemove.map((k) => this.storage.remove(k)));
    this.trackedKeyCount = Math.max(0, this.trackedKeyCount - keysToRemove.length);
  }
}
