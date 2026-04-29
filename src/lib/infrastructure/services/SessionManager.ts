import { TIMEOUTS } from "../../config/timeouts";
import { ISession, ISessionManager, IStorage } from "../../domain/interfaces";
import { logger } from "../../utils/logger";

export class SessionManager implements ISessionManager {
  private readonly SESSION_KEY = "scraper_session";
  private sessionReadyPromise: Promise<void> | null = null;
  private sessionReadyResolver: (() => void) | null = null;

  constructor(private storage: IStorage) {}

  async initialize(): Promise<void> {
    try {
      const existingSession = await this.getSession();
      let promiseResolver: (() => void) | null = null;

      if (!existingSession) {
        logger.info("SessionManager", "No existing session, creating initial session");
        // Create initial session to avoid 403 on first requests
        const initialSession: ISession = {
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          cookies: ""
        };
        await this.setSession(initialSession);
      } else if (existingSession.cookies && existingSession.cookies.length > 0) {
        // Session has cookies - mark as ready immediately
        logger.debug("SessionManager", "Existing session with cookies found");
        promiseResolver = () => {}; // Will be called immediately after promise creation
      } else {
        logger.debug("SessionManager", "Existing session found (no cookies)");
      }

      // Create a promise that resolves when cookies are updated from WebView
      this.sessionReadyPromise = new Promise(resolve => {
        this.sessionReadyResolver = resolve;
        // Resolve immediately if we already have cookies
        if (promiseResolver) {
          resolve();
        }
      });
    } catch (error) {
      logger.error("SessionManager", "Failed to initialize", error);
      throw error;
    }
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
      // If this session has cookies, mark as ready
      if (session.cookies && session.cookies.length > 0 && this.sessionReadyResolver) {
        logger.info("SessionManager", `Session updated with ${session.cookies.length} cookies`);
        this.sessionReadyResolver();
        // Don't nullify resolver - allow multiple session updates
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
        // Wait for cookies from WebView with 30s fallback timeout
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

  async refreshCookies(): Promise<void> {
    // No-op - keep simple for now
    logger.warn("SessionManager", "refreshCookies called but not implemented");
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
  }
}
