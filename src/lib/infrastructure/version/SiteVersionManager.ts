import { CACHE_PREFIXES } from "../../config/cacheKeys";
import { PERF_LIMITS } from "../../config/limits";
import type { ISession, ISessionManager, ISiteVersionManager } from "../../domain/interfaces";
import { CacheRepo } from "../../domain/repositories/cacheRepo";
import { unwrapCookies } from "../../utils/cookies";
import { logger } from "../../utils/logger";

export class SiteVersionManager implements ISiteVersionManager {
  private sessionManager: ISessionManager;
  private cache: CacheRepo;

  constructor(sessionManager: ISessionManager, cache: CacheRepo) {
    this.sessionManager = sessionManager;
    this.cache = cache;
  }

  /**
   * Calculate a simple hash of HTML structure to detect site changes
   * Uses only structural elements, not content
   */
  calculateSiteHash(html: string): string {
    const structural = html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s+/g, " ")
      .replace(/"[^"]*"/g, '""')
      .slice(0, PERF_LIMITS.SITE_VERSION_SAMPLE_SIZE);

    let hash = 0;
    for (let i = 0; i < structural.length; i++) {
      const char = structural.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get current stored site version from session
   */
  async getStoredVersion(): Promise<string | null> {
    try {
      const session = await this.sessionManager.getSession();
      if (session?.cookies != null) {
        try {
          const parsed = JSON.parse(session.cookies);
          if (parsed != null && typeof parsed === "object" && "siteVersion" in parsed) {
            return parsed.siteVersion as string;
          }
        } catch {
          // cookies is a plain string, not JSON-wrapped
        }
        return null;
      }
    } catch (e: unknown) {
      logger.warn("SiteVersionManager", "Failed to get stored version", e);
    }
    return null;
  }

  /**
   * Check if site structure has changed
   */
  async hasSiteChanged(html: string): Promise<{ changed: boolean; currentHash: string; storedHash: string | null }> {
    const currentHash = this.calculateSiteHash(html);
    const storedHash = await this.getStoredVersion();

    return {
      changed: storedHash !== null && storedHash !== currentHash,
      currentHash,
      storedHash,
    };
  }

  /**
   * Invalidate cache when site structure changes
   */
  async invalidateCache(): Promise<void> {
    try {
      await Promise.all([
        this.cache.clearWithPrefix(CACHE_PREFIXES.HOME),
        this.cache.clearWithPrefix(`${CACHE_PREFIXES.DETAILS}_`),
        this.cache.clearWithPrefix(`${CACHE_PREFIXES.SEARCH}_`),
        this.cache.clearWithPrefix(`${CACHE_PREFIXES.SUGGESTIONS}_`),
        this.cache.clearWithPrefix(`${CACHE_PREFIXES.SERVERS}_`),
        this.cache.clearWithPrefix(`${CACHE_PREFIXES.STREAM}_`),
      ]);
      logger.info("SiteVersionManager", "Cache invalidated successfully");
    } catch (e: unknown) {
      logger.warn("SiteVersionManager", "Failed to invalidate cache", e);
    }
  }

  /**
   * Store new site version in session
   * Wraps raw cookies in JSON object with metadata
   */
  async storeVersion(version: string): Promise<void> {
    try {
      const session = await this.sessionManager.getSession();
      if (!session) return;

      let rawCookies = session.cookies || "";
      rawCookies = unwrapCookies(rawCookies);

      const cookieData = {
        raw: rawCookies,
        siteVersion: version,
      };

      const updatedSession: ISession = {
        cookies: JSON.stringify(cookieData),
        userAgent: session.userAgent || "",
      };

      await this.sessionManager.setSession(updatedSession);
    } catch (e: unknown) {
      logger.warn("SiteVersionManager", "Failed to store version", e);
    }
  }

  /**
   * Check version and invalidate cache if needed
   * Returns true if cache was invalidated
   */
  async checkAndInvalidateIfNeeded(html: string): Promise<boolean> {
    const { changed, currentHash, storedHash } = await this.hasSiteChanged(html);

    if (storedHash === null) {
      await this.storeVersion(currentHash);
      return false;
    }

    if (changed) {
      logger.info(
        "SiteVersionManager",
        `Site structure changed from ${storedHash} to ${currentHash}, invalidating cache`
      );
      await this.invalidateCache();
      await this.storeVersion(currentHash);
      return true;
    }

    return false;
  }
}
