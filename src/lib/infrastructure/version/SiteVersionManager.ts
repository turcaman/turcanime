import { CACHE_PREFIXES } from "../../config/cacheKeys";
import { PERF_LIMITS } from "../../config/limits";
import type { ISession, ISessionManager, ISiteVersionManager } from "../../domain/interfaces";
import { CacheRepo } from "../../domain/repositories/cacheRepo";
import { log } from "../../utils/logger";

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
      .replace(/<!--[\s\S]*?-->/g, "") // Remove comments
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/"[^"]*"/g, '""') // Normalize attribute values
      .slice(0, PERF_LIMITS.SITE_VERSION_SAMPLE_SIZE);

    let hash = 0;
    for (let i = 0; i < structural.length; i++) {
      const char = structural.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
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
        // Try to parse as JSON (new format with metadata)
        try {
          const parsed = JSON.parse(session.cookies);
          return parsed.siteVersion ?? null;
        } catch {
          // Raw cookie string (old format or first run) - not JSON
          return null;
        }
      }
    } catch (e: unknown) {
      log("SiteVersionManager", "Failed to get stored version", e);
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
      ]);
      log("SiteVersionManager", "Cache invalidated successfully");
    } catch (e: unknown) {
      log("SiteVersionManager", "Failed to invalidate cache", e);
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

      // Get raw cookies - handle both old format (raw string) and new format (JSON)
      let rawCookies = session.cookies || "";
      try {
        // Try to extract from existing JSON wrapper
        const parsed = JSON.parse(rawCookies);
        rawCookies = parsed.raw ?? "";
      } catch {
        // Already raw string or empty, use as-is
      }

      // Create JSON wrapper with metadata
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
      log("SiteVersionManager", "Failed to store version", e);
    }
  }

  /**
   * Check version and invalidate cache if needed
   * Returns true if cache was invalidated
   */
  async checkAndInvalidateIfNeeded(html: string): Promise<boolean> {
    const { changed, currentHash, storedHash } = await this.hasSiteChanged(html);

    if (storedHash === null) {
      // First time - store current version
      await this.storeVersion(currentHash);
      return false;
    }

    if (changed) {
      log(
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
