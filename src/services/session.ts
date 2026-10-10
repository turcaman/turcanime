import { SOURCE_CONFIG } from "../config/source";
import type { ISession } from "../types";
import { logger } from "../utils/logger";
import { SourceError } from "../utils/errors";
import { storage } from "../utils/storage";
import { unwrapCookies, mergeCookies } from "./cookies";
import { isChallengeHtml } from "./parsers";
import { webViewBridge } from "./webview";
import NetInfo from "@react-native-community/netinfo";

export const SESSION_KEY = "scraper_session";
// Slow devices can take well over 15s to clear a Cloudflare challenge.
// Matches the bootstrap poll window so both sides share one 40s timing.
const SESSION_REFRESH_TIMEOUT = 40_000;
const SESSION_MAX_AGE = 60 * 60 * 1000;
const OFFLINE_CONFIRM_DELAY = 1_000;
const OFFLINE_PROBE_TIMEOUT = 5_000;
const SESSION_PROBE_TIMEOUT = 5_000;

export function isValidSessionCookies(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const unwrapped = unwrapCookies(raw).trim();
  if (unwrapped.length === 0) return false;
  return unwrapped.includes("=");
}

/**
 * NetInfo reports `isInternetReachable: false` transiently right after boot,
 * so a single reading cannot back a load error. Offline only after the flag
 * persists past a delay AND a real probe to the site fails.
 */
async function isOffline(): Promise<boolean> {
  try {
    if (!(await netinfoOffline())) return false;
    await new Promise((resolve) => setTimeout(resolve, OFFLINE_CONFIRM_DELAY));
    if (!(await netinfoOffline())) {
      logger.debug("session", "Offline flag cleared on re-check, continuing");
      return false;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OFFLINE_PROBE_TIMEOUT);
    try {
      await fetch(`${SOURCE_CONFIG.baseUrl}/`, { method: "HEAD", signal: controller.signal });
      logger.debug("session", "Offline flag set but probe reached the site, continuing");
      return false;
    } catch {
      return true;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

async function netinfoOffline(): Promise<boolean> {
  try {
    const net = await NetInfo.fetch();
    return net.isConnected === false || net.isInternetReachable === false;
  } catch {
    return false;
  }
}

/**
 * Washes can yield shape-valid cookies the site still rejects (e.g. a
 * Cloudflare clearance bound to the WebView stack never reaches fetch).
 * Fails only on definitive rejection: 401/403 or challenge HTML. Network
 * errors, timeouts and 5xx stay successful so flakiness never fails a wash.
 */
async function probeSession(session: ISession | null): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SESSION_PROBE_TIMEOUT);
  try {
    const baseUrl = SOURCE_CONFIG.baseUrl;
    const res = await fetch(`${baseUrl}/`, {
      signal: controller.signal,
      headers: {
        "User-Agent": session?.userAgent ?? "",
        Cookie: unwrapCookies(session?.cookies ?? ""),
        Referer: `${baseUrl}/`,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });
    if (res.status === 401 || res.status === 403) {
      logger.warn("session", `Probe rejected with HTTP ${res.status}`);
      return false;
    }
    // Challenge fingerprint only exists in HTML bodies; skip the full read
    // otherwise — the home page can be hundreds of KB on a slow connection
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return true;
    try {
      if (isChallengeHtml(await res.text())) {
        logger.warn("session", "Probe returned a challenge page");
        return false;
      }
    } catch {
      // Unreadable body is not proof of an unusable jar
    }
    return true;
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
  }
}

class SessionManager {
  private sessionReadyPromise: Promise<void> | null = null;
  private sessionReadyResolver: (() => void) | null = null;
  private refreshPromise: Promise<void> | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  // Serializes cookie read-modify-write: concurrent fetches merging their own
  // Set-Cookie batches from the same base would drop each other's additions
  private cookieMergeChain: Promise<void> = Promise.resolve();

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
      // Without network the WebView wash can never report; fail fast only
      // after isOffline() confirms it — a transient NetInfo reading would
      // otherwise turn a warm boot into a load error.
      if (await isOffline()) {
        logger.debug("session", "Offline confirmed, failing gate fast");
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
    try {
      webViewBridge.navigateTo(SOURCE_CONFIG.sessionWashUrl);
      await this.waitForCookies();
      const session = await this.getSession();
      if (!isValidSessionCookies(session?.cookies)) {
        logger.warn("session", "Wash settled but cookies still invalid");
        throw new SourceError("Session refresh failed - no valid cookies received", "AUTH_ERROR");
      }
      if (!(await probeSession(session))) {
        throw new SourceError("Session refresh failed - cookies rejected by site", "AUTH_ERROR");
      }
    } catch (error) {
      // A failed wash must not leave every later request parked behind the
      // closed gate for 40s; with shape-valid stored cookies, the next fetch
      // decides instantly (403 → ladder) instead of idling into the same error
      const stored = await this.getSession();
      if (isValidSessionCookies(stored?.cookies)) {
        logger.warn("session", "Wash failed, reopening gate for existing cookies");
        this.resolveGate();
      }
      throw error;
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
