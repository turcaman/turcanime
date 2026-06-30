import { TIMEOUTS } from "../../config/timeouts";
import type { ISession, ISessionManager, IStorage } from "../../domain/interfaces";
import { logger } from "../../utils/logger";

export class SessionManager implements ISessionManager {
  private readonly SESSION_KEY = "scraper_session";
  private sessionReadyPromise: Promise<void> | null = null;
  private sessionReadyResolver: (() => void) | null = null;

  constructor(private storage: IStorage) {}

  async initialize(): Promise<void> {
    let promiseResolver: (() => void) | null = null;

    try {
      const existingSession = await this.getSession();

      if (!existingSession) {
        logger.info("SessionManager", "No existing session, creating initial session");
        // Create initial session to avoid 403 on first requests
        const initialSession: ISession = {
          userAgent: "",
          cookies: ""
        };
        await this.setSession(initialSession);
      } else if (existingSession.cookies && existingSession.cookies.length > 0) {
        logger.debug("SessionManager", "Existing session with cookies found");
        promiseResolver = () => {};
      } else {
        logger.debug("SessionManager", "Existing session found (no cookies)");
      }
    } catch (error) {
      logger.error("SessionManager", "Failed to load session, continuing with empty", error);
    }

    // Always create the promise, even if session loading failed
    // This ensures waitForCookies() never hangs indefinitely
    this.sessionReadyPromise = new Promise(resolve => {
      this.sessionReadyResolver = resolve;
      if (promiseResolver) {
        resolve();
      }
    });
  }

  async getSession(): Promise<ISession | null> {
    try {
      return this.storage.get<ISession>(this.SESSION_KEY);
    } catch (error) {
      logger.error("SessionManager", "Failed to get session", error);
      return null;
    }
  }

  async setSession(session: ISession): Promise<void> {
    try {
      await this.storage.set(this.SESSION_KEY, session);
      if (session.cookies && session.cookies.length > 0 && this.sessionReadyResolver) {
        logger.info("SessionManager", `Session updated with ${session.cookies.length} cookies`);
        this.sessionReadyResolver();
        this.sessionReadyResolver = null; // Prevent memory leaks
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
        // The bootstrap.js handles Cloudflare detection, but this is a safety net
        logger.debug("SessionManager", "Waiting for cookies from WebView");
        await Promise.race([
          this.sessionReadyPromise,
          new Promise(resolve => setTimeout(resolve, TIMEOUTS.SESSION_INIT))
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
      const cleanedSession: ISession = {
        userAgent: session.userAgent,
        cookies: ""
      };
      await this.setSession(cleanedSession);
      logger.info("SessionManager", "Cookies invalidated due to auth errors");
    }

    // Reset promise so waitForCookies() actually waits for fresh cookies
    this.sessionReadyPromise = new Promise(resolve => {
      this.sessionReadyResolver = resolve;
    });
  }
}
