import { TIMEOUTS } from "../config/cache";
import { SOURCE_CONFIG } from "../config/source";
import type { ISession } from "../types";
import { logger } from "../utils/logger";
import { storage } from "../utils/storage";
import { webViewBridge } from "./webview";

const SESSION_KEY = "scraper_session";

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
      await storage.set(SESSION_KEY, session);
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
        await Promise.race([
          this.sessionReadyPromise,
          new Promise((resolve) => setTimeout(resolve, TIMEOUTS.SESSION_INIT)),
        ]);
        logger.debug("SessionManager", "Cookies ready or timeout reached");
      }
    } catch (error) {
      logger.error("SessionManager", "Failed to wait for cookies", error);
      throw error;
    }
  }

  async invalidateCookies(): Promise<void> {
    const session = await this.getSession();
    if (session) {
      await this.setSession({ userAgent: session.userAgent, cookies: "" });
      logger.info("SessionManager", "Cookies invalidated due to auth errors");
    }
    this.sessionReadyPromise = new Promise((resolve) => {
      this.sessionReadyResolver = resolve;
    });
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
    await this.invalidateCookies();
    webViewBridge.navigateTo(SOURCE_CONFIG.sessionWashUrl);
    await this.waitForCookies();
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
