import { SOURCE_CONFIG } from "../config/source";
import type { ISession } from "../types";
import { logger } from "../utils/logger";
import { SourceError } from "../utils/errors";
import { storage } from "../utils/storage";
import { mergeCookies } from "./cookies";
import { webViewBridge } from "./webview";

export const SESSION_KEY = "scraper_session";
// Slow devices can take well over 15s to clear a Cloudflare challenge.
// Matches the bootstrap poll window so both sides share one 40s timing.
const SESSION_REFRESH_TIMEOUT = 40_000;
// After a failed wash, retries skip washing briefly: stacked 40s waits would
// hang the ladder while Cloudflare is down. The next fetch decides instead.
const WASH_FAIL_FAST_WINDOW = 15_000;
// WebView often reports twice in one wash (partial then full cookies).
// Opening on the first report fires requests with an incomplete jar and
// guarantees a 403. Settle: consume only after 1.5s without new updates.
const REPORT_SETTLE_MS = 1_500;

export function isValidSessionCookies(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return false;
  return trimmed.includes("=");
}

class SessionManager {
  private refreshPromise: Promise<void> | null = null;
  // One pending wash waiter; resolves true on a settled report, false on timeout
  private reportWaiter: ((settled: boolean) => void) | null = null;
  private reportSettleTimer: ReturnType<typeof setTimeout> | null = null;
  private lastWashFailedAt = 0;
  // Serializes cookie read-modify-write: concurrent fetches merging their own
  // Set-Cookie batches from the same base would drop each other's additions
  private cookieMergeChain: Promise<void> = Promise.resolve();

  async initialize(): Promise<void> {
    try {
      const existing = await this.getSession();
      if (!existing) {
        logger.info("session", "No existing session, creating initial session");
        await storage.set(SESSION_KEY, { userAgent: "", cookies: "" });
      }
    } catch (error) {
      logger.error("session", "Failed to load session", error);
    }
  }

  async getSession(): Promise<ISession | null> {
    try {
      return storage.get<ISession>(SESSION_KEY);
    } catch (error) {
      logger.error("session", "Failed to get session", error);
      return null;
    }
  }

  /** The only writer of the session; a valid report releases wash waiters */
  async setSession(session: ISession): Promise<void> {
    try {
      const valid = isValidSessionCookies(session.cookies);
      if (!valid) {
        // An empty report (challenge still running) never clobbers a good jar
        const current = await this.getSession();
        if (current != null && isValidSessionCookies(current.cookies)) return;
        await storage.set(SESSION_KEY, session);
        return;
      }
      await storage.set(SESSION_KEY, session);
      logger.info("session", `Session updated with ${session.cookies.length} cookies`);
      this.signalReport();
    } catch (error) {
      logger.error("session", "Failed to set session", error);
      throw error;
    }
  }

  async mergeSetCookies(setCookies: string[]): Promise<void> {
    this.cookieMergeChain = this.cookieMergeChain.then(async () => {
      try {
        const session = await this.getSession();
        if (!session) return;
        const merged = mergeCookies(session.cookies, setCookies);
        if (merged !== session.cookies) {
          logger.debug("fetch", `Cookie merge ${session.cookies.length}→${merged.length} chars`);
          await this.setSession({ ...session, cookies: merged });
        }
      } catch (error) {
        // Cookie capture never fails the request
        logger.warn("session", "Cookie merge failed", error);
      }
    });
    return this.cookieMergeChain;
  }

  /** Singleflight wash: navigate the worker, wait out a settled cookie report */
  async refresh(): Promise<void> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.executeRefresh();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async executeRefresh(): Promise<void> {
    const startedAt = Date.now();
    if (Date.now() - this.lastWashFailedAt < WASH_FAIL_FAST_WINDOW) {
      throw new SourceError("Session wash failed recently - fetch decides", "AUTH_ERROR");
    }
    try {
      if (!webViewBridge.canNavigate()) {
        throw new SourceError("WebView worker unavailable", "AUTH_ERROR");
      }
      // Arm before navigating so the first report is never missed
      const reported = this.waitForReport();
      webViewBridge.navigateTo(SOURCE_CONFIG.sessionWashUrl);
      const settled = await reported;
      if (!settled) {
        throw new SourceError("Session wash timed out - no cookie report", "AUTH_ERROR");
      }
      const session = await this.getSession();
      if (!isValidSessionCookies(session?.cookies)) {
        throw new SourceError("Session wash got no valid cookies", "AUTH_ERROR");
      }
      this.lastWashFailedAt = 0;
      logger.info("session", `Session refreshed successfully in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
    } catch (error) {
      this.lastWashFailedAt = Date.now();
      throw error;
    }
  }

  private signalReport(): void {
    if (!this.reportWaiter) return;
    if (this.reportSettleTimer) clearTimeout(this.reportSettleTimer);
    this.reportSettleTimer = setTimeout(() => {
      this.reportSettleTimer = null;
      this.reportWaiter?.(true);
    }, REPORT_SETTLE_MS);
  }

  private waitForReport(): Promise<boolean> {
    return new Promise((resolve) => {
      const waiter = (settled: boolean) => {
        if (this.reportWaiter !== waiter) return;
        this.reportWaiter = null;
        if (this.reportSettleTimer) {
          clearTimeout(this.reportSettleTimer);
          this.reportSettleTimer = null;
        }
        resolve(settled);
      };
      this.reportWaiter = waiter;
      setTimeout(() => waiter(false), SESSION_REFRESH_TIMEOUT);
    });
  }
}

export const sessionManager = new SessionManager();

export async function refreshSession(): Promise<void> {
  logger.debug("session", "refreshSession called");
  await sessionManager.refresh();
}
