import { SOURCE_CONFIG } from "../config/source";
import type { ISession } from "../types";
import { logger } from "../utils/logger";
import { storage } from "../utils/storage";
import { webViewBridge } from "./webview";

export const SESSION_KEY = "scraper_session";
// Slow devices can take well over 15s to clear a Cloudflare challenge
const SESSION_REFRESH_TIMEOUT = 30_000;
// CF clearance cookies typically outlive this; refresh proactively before the
// origin discovers expiry with a 403
const SESSION_MAX_AGE = 50 * 60 * 1000;

class SessionManager {
  private sessionReadyPromise: Promise<void> | null = null;
  private sessionReadyResolver: (() => void) | null = null;
  private refreshPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    let promiseResolver: (() => void) | null = null;

    try {
      const existingSession = await this.getSession();
      if (!existingSession) {
        logger.info("SessionManager", "No existing session, creating initial session");
        await this.setSession({ userAgent: "", cookies: "" });
      } else if (existingSession.cookies && existingSession.cookies.length > 0) {
        promiseResolver = () => {};
      }
    } catch (error) {
      logger.error("SessionManager", "Failed to load session", error);
    }

    this.sessionReadyPromise = new Promise((resolve) => {
      this.sessionReadyResolver = resolve;
      if (promiseResolver) resolve();
    });
  }

  async getSession(): Promise<ISession | null> {
    try {
      return storage.get<ISession>(SESSION_KEY);
    } catch (error) {
      logger.error("SessionManager", "Failed to get session", error);
      return null;
    }
  }

  async setSession(session: ISession): Promise<void> {
    try {
      const withMeta: ISession = { ...session, fetchedAt: Date.now() };
      await storage.set(SESSION_KEY, withMeta);
      if (session.cookies && session.cookies.length > 0 && this.sessionReadyResolver) {
        logger.info("SessionManager", `Session updated with ${session.cookies.length} cookies`);
        this.sessionReadyResolver();
        this.sessionReadyResolver = null;
      }
    } catch (error) {
      logger.error("SessionManager", "Failed to set session", error);
      throw error;
    }
  }

  async waitForCookies(): Promise<void> {
    try {
      if (!this.sessionReadyPromise) {
        logger.debug("SessionManager", "No session promise, initializing");
        await this.initialize();
      }
      if (this.sessionReadyPromise) {
        logger.debug("SessionManager", "Waiting for cookies from WebView");

        const maxAttempts = 30;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const raceResult = await Promise.race([
            this.sessionReadyPromise.then(() => "resolved" as const),
            new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 2000)),
          ]);

          if (raceResult === "resolved") {
            const session = await this.getSession();
            if (session?.cookies && session.cookies.length > 0) {
              logger.debug("SessionManager", `Cookies ready after ~${(attempt + 1) * 2}s`);
              return;
            }
          }

          logger.debug("SessionManager", `Waiting for cookies... attempt ${attempt + 1}/${maxAttempts}`);
        }

        logger.warn("SessionManager", "Cookies not received within 60s, proceeding anyway");
      }
    } catch (error) {
      logger.error("SessionManager", "Failed to wait for cookies", error);
      throw error;
    }
  }

  async acquireFreshSession(): Promise<void> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.executeRefresh();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async executeRefresh(): Promise<void> {
    // Atomic swap: keep the current session in storage while the WebView fetches
    // a new one. Clearing cookies up front killed every request that raced the
    // refresh and left the app dead when the challenge timed out.
    this.sessionReadyPromise = new Promise((resolve) => {
      this.sessionReadyResolver = resolve;
    });
    webViewBridge.navigateTo(SOURCE_CONFIG.sessionWashUrl);
    await Promise.race([
      this.waitForCookies(),
      new Promise<void>((resolve) => setTimeout(resolve, SESSION_REFRESH_TIMEOUT)),
    ]);
    const session = await this.getSession();
    if (!session?.cookies) {
      throw new Error("Session refresh failed - no cookies received");
    }
    logger.info("infrastructure", "Session refreshed successfully");
  }
}

export const sessionManager = new SessionManager();

export async function refreshSession(): Promise<void> {
  logger.info("infrastructure", "refreshSession called");
  await sessionManager.acquireFreshSession();
}

/**
 * Refresh proactively when the stored cookies are older than SESSION_MAX_AGE,
 * so an expired clearance never surfaces as a user-facing 403.
 * Boot flow (no cookies yet) and legacy sessions (no fetchedAt) are left alone.
 */
export async function ensureFreshSession(): Promise<void> {
  try {
    const session = await sessionManager.getSession();
    if (!session?.cookies || !session.fetchedAt) return;
    const age = Date.now() - session.fetchedAt;
    if (age < SESSION_MAX_AGE) return;
    logger.info("infrastructure", `Session is ${Math.round(age / 60000)}min old, refreshing proactively`);
    await refreshSession();
  } catch (error) {
    logger.warn("infrastructure", "Proactive session refresh failed", error);
  }
}
