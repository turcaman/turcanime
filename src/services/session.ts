import { SOURCE_CONFIG } from "../config/source";
import type { ISession } from "../types";
import { logger } from "../utils/logger";
import { SourceError } from "../utils/errors";
import { storage } from "../utils/storage";
import { unwrapCookies } from "./cookies";
import { webViewBridge } from "./webview";
import NetInfo from "@react-native-community/netinfo";

export const SESSION_KEY = "scraper_session";
// Slow devices can take well over 15s to clear a Cloudflare challenge.
// Matches the bootstrap poll window so both sides share one 40s timing.
const SESSION_REFRESH_TIMEOUT = 40_000;
const SESSION_MAX_AGE = 60 * 60 * 1000;

export function isValidSessionCookies(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const unwrapped = unwrapCookies(raw).trim();
  if (unwrapped.length === 0) return false;
  return unwrapped.includes("=");
}

async function isOffline(): Promise<boolean> {
  try {
    const net = await NetInfo.fetch();
    return net.isConnected === false || net.isInternetReachable === false;
  } catch {
    return false;
  }
}

class SessionManager {
  private sessionReadyPromise: Promise<void> | null = null;
  private sessionReadyResolver: (() => void) | null = null;
  private refreshPromise: Promise<void> | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  // The gate blocks request traffic until non-empty cookies exist: arming
  // creates a fresh closed gate, and only a session with cookies opens it
  private armGate(): void {
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    this.sessionReadyPromise = new Promise((resolve) => {
      this.sessionReadyResolver = resolve;
    });
  }

  private resolveGate(): void {
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    if (this.sessionReadyResolver) {
      this.sessionReadyResolver();
      this.sessionReadyResolver = null;
    }
  }

  // WebView often reports twice in one wash (partial then full cookies).
  // Opening on the first report fires requests with an incomplete jar and
  // guarantees a 403. Settle: open only after 1.5s without new updates.
  private resolveGateSettled(): void {
    if (!this.sessionReadyResolver) return;
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      this.settleTimer = null;
      this.resolveGate();
    }, 1500);
  }

  async initialize(): Promise<void> {
    let hasCookies = false;

    try {
      const existingSession = await this.getSession();
      if (!existingSession) {
        logger.info("session", "No existing session, creating initial session");
        await this.setSession({ userAgent: "", cookies: "" });
      } else if (isValidSessionCookies(existingSession.cookies)) {
        hasCookies = true;
      }
    } catch (error) {
      logger.error("session", "Failed to load session", error);
    }

    this.armGate();
    if (hasCookies) this.resolveGate();
  }

  async getSession(): Promise<ISession | null> {
    try {
      return storage.get<ISession>(SESSION_KEY);
    } catch (error) {
      logger.error("session", "Failed to get session", error);
      return null;
    }
  }

  async setSession(session: ISession): Promise<void> {
    try {
      const valid = isValidSessionCookies(session.cookies);
      const current = await this.getSession();
      if (!valid) {
        if (current != null && isValidSessionCookies(current.cookies)) return;
        await storage.set(SESSION_KEY, { ...session, fetchedAt: Date.now() });
        return;
      }
      // Preserve the original capture time when cookies are unchanged: every
      // response echoing the same Set-Cookie values would otherwise reset the
      // age and perpetually defer the proactive refresh
      let fetchedAt = Date.now();
      if (current != null && current.cookies === session.cookies && current.fetchedAt != null) {
        fetchedAt = current.fetchedAt;
      }
      const withMeta: ISession = { ...session, fetchedAt };
      await storage.set(SESSION_KEY, withMeta);
      logger.info("session", `Session updated with ${session.cookies.length} cookies`);
      this.resolveGateSettled();
    } catch (error) {
      logger.error("session", "Failed to set session", error);
      throw error;
    }
  }

  async touchSession(): Promise<void> {
    const current = await this.getSession();
    if (current == null) return;
    try {
      const latest = await this.getSession();
      if (latest != null && latest.cookies !== current.cookies) return;
      await storage.set(SESSION_KEY, { ...current, fetchedAt: Date.now() });
      logger.debug("session", "Freshness stamped after wash");
    } catch (error) {
      logger.warn("session", "Freshness stamp failed", error);
    }
  }

  async waitForCookies(): Promise<void> {
    try {
      // Without network the WebView wash can never report; fail fast instead
      // of holding the skeleton through the 40s gate plus ladder retries.
      if (await isOffline()) {
        logger.debug("session", "Offline, failing gate fast");
        throw new SourceError("No connection", "NETWORK_ERROR");
      }
      if (!this.sessionReadyPromise) {
        logger.debug("session", "No session promise, initializing");
        await this.initialize();
      }
      const gate = this.sessionReadyPromise;
      if (!gate) return;
      const gateStart = Date.now();
      logger.debug("session", "Waiting for cookies from WebView");
      const raceResult = await Promise.race([
        gate.then(() => "resolved" as const),
        new Promise<"timeout">((resolve) =>
          setTimeout(() => resolve("timeout"), SESSION_REFRESH_TIMEOUT),
        ),
      ]);
      if (raceResult === "timeout") {
        logger.warn("session", "Gate timeout after 40s, no valid cookies");
        throw new SourceError("Session timeout - no valid cookies received", "AUTH_ERROR");
      }
      const session = await this.getSession();
      if (!isValidSessionCookies(session?.cookies)) {
        throw new SourceError("Session timeout - no valid cookies received", "AUTH_ERROR");
      }
      logger.debug(
        "session",
        `Gate opened after ${((Date.now() - gateStart) / 1000).toFixed(1)}s (${session?.cookies.length ?? 0} chars)`,
      );
    } catch (error) {
      logger.error("session", "Failed to wait for cookies", error);
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
    // Singleflight via acquireFreshSession: concurrent callers share this one
    // execution. Gate is armed once, WebView navigates once, every waiter
    // shares the same 40s wait. Valid session opens it, timeout throws.
    const startedAt = Date.now();
    this.armGate();
    webViewBridge.navigateTo(SOURCE_CONFIG.sessionWashUrl);
    await this.waitForCookies();
    const session = await this.getSession();
    if (!isValidSessionCookies(session?.cookies)) {
      logger.warn("session", "Wash settled but cookies still invalid");
      throw new SourceError("Session refresh failed - no valid cookies received", "AUTH_ERROR");
    }
    logger.info("session", `Session refreshed successfully in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  }
}

export const sessionManager = new SessionManager();

export async function refreshSession(): Promise<void> {
  logger.debug("session", "refreshSession called");
  await sessionManager.acquireFreshSession();
}

/**
 * Refresh when stored cookies are missing or older than SESSION_MAX_AGE.
 * Boot with no cookies relies on the initial WebView load.
 */
export async function ensureFreshSession(): Promise<void> {
  try {
    if (await isOffline()) return;
    const session = await sessionManager.getSession();
    if (session != null && isValidSessionCookies(session.cookies)) {
      const ageMs = session.fetchedAt == null ? null : Date.now() - session.fetchedAt;
      if (ageMs == null || ageMs > SESSION_MAX_AGE) {
        const age = ageMs == null ? "unknown age" : `${Math.round(ageMs / 60000)}m`;
        logger.info("session", `Session aged (${age}), refreshing`);
        await refreshSession();
        await sessionManager.touchSession();
      } else {
        logger.debug("session", `Session fresh (${Math.round(ageMs / 60000)}m old), skipping wash`);
      }
      return;
    }
    if (!session?.cookies) {
      logger.debug("session", "No stored session, boot WebView load decides");
      return;
    }
    logger.info("session", `Session cookies invalid (len=${session.cookies.length}), refreshing`);
    await refreshSession();
  } catch (error) {
    logger.warn("session", "Proactive session refresh failed", error);
  }
}
