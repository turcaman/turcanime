import { TIMEOUTS } from "../../config/timeouts";
import { ISession, IWebViewBridge, WebViewMessageData } from "../../domain/interfaces";
import { logger } from "../../utils/logger";
import { JWPLAYER_EXTRACT_JS } from "../webview/injectionScripts";

// ─── Internal types ────────────────────────────────────────────────────

type NavigateFn = (uri: string) => void;
type Resolver = (url: string | null) => void;

/**
 * Manages the logic for interacting with the WebView worker.
 * Decoupled from the React component state to allow for easier testing.
 */
export class WebViewBridge implements IWebViewBridge {
  private activeDecryptions = new Map<string, Resolver>();
  private currentRequestId: string | null = null;
  private navigateFn: NavigateFn | null = null;
  private injectFn: ((code: string) => void) | null = null;
  private pageLoadResolver: ((value: void) => void) | null = null;

  /**
   * Called by WebViewWorker to register its navigation capability.
   */
  registerNavigation(fn: NavigateFn) {
    this.navigateFn = fn;
  }

  /**
   * Called by WebViewWorker to register its JS injection capability.
   */
  registerInjection(fn: (code: string) => void) {
    this.injectFn = fn;
  }

  /**
   * Notifies the bridge that the WebView has finished loading a page.
   */
  notifyPageLoaded() {
    if (this.pageLoadResolver) {
      this.pageLoadResolver();
      this.pageLoadResolver = null;
    }
  }

  handleMessage(message: string): { type: string; data: WebViewMessageData } | null {
    try {
      const parsed = JSON.parse(message);

      // Handle legacy format (without type field) for backward compatibility
      if (!parsed.type && typeof parsed === "object") {
        // Legacy format: { id, data, error } or string or ISession
        return this.handleLegacyMessage(parsed);
      }

      const { type, data } = parsed;

      if (type === "DECRYPTION_RESULT") {
        let { id, data: url, error } = data;

        // Compatibility: if the bootstrap sends 'stream_auto', map it to the current active request
        if (id === "stream_auto" && this.currentRequestId) {
          id = this.currentRequestId;
        }

        const resolve = this.activeDecryptions.get(id);
        if (resolve) {
          this.activeDecryptions.delete(id);
          logger.debug("WebViewBridge", `DECRYPTION_RESULT for ${id}: ${url ? "OK" : "null"} ${error || ""}`);
          resolve(url || null);
        }
      }

      // Generic embed video URL interception — resolve the current pending request
      if (type === "EMBED_VIDEO_URL") {
        const requestId = this.currentRequestId;
        if (requestId) {
          const autoResolve = this.activeDecryptions.get(requestId);
          logger.debug("WebViewBridge", `EMBED_VIDEO_URL intercepted: ${data.url}, resolving request: ${requestId}`);
          if (autoResolve) {
            this.activeDecryptions.delete(requestId);
            autoResolve(data.url);
          }
        }
      }

      return { type, data };
    } catch {
      return null;
    }
  }

  private handleLegacyMessage(parsed: unknown): { type: string; data: WebViewMessageData } | null {
    // Handle legacy format for backward compatibility
    if (typeof parsed === "string") {
      const data: WebViewMessageData = { type: "RAW", data: parsed };
      return { type: "RAW", data };
    }

    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;

      // Legacy DECRYPTION_RESULT format
      if ("id" in obj && "data" in obj) {
        const data: WebViewMessageData = {
          type: "DECRYPTION_RESULT",
          id: String(obj.id),
          data: obj.data as string | null,
          error: "error" in obj ? String(obj.error) : undefined,
        };
        return { type: "DECRYPTION_RESULT", data };
      }

      // Legacy SESSION format
      if ("cookies" in obj && "userAgent" in obj) {
        const data: WebViewMessageData = {
          type: "SESSION",
          session: obj as unknown as ISession,
        };
        return { type: "SESSION", data };
      }
    }

    return null;
  }

  /**
   * Navigates to the video URL and waits for the bootstrap to auto-decrypt
   * or intercept. Also injects JS extraction scripts for JWPlayer embeds.
   */
  async resolveStreamUrl(videoUrl: string): Promise<string | null> {
    if (!this.navigateFn) throw new Error("WebView navigation not registered");

    // Generate unique ID to avoid race conditions between episode switches
    const requestId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentRequestId = requestId;

    // --- SESSION WASH STEP ---
    // Navigate to Home first to reset session/cookies and obtain a clean Referer
    // TODO: Make this provider-agnostic - inject session wash URL from provider config
    logger.debug("WebViewBridge", "Starting session wash: navigating to Home...");
    this.navigateFn("https://www.animelatinohd.com/");

    try {
      await this.waitForPageLoad(TIMEOUTS.PAGE_LOAD);
      logger.debug("WebViewBridge", "Session wash complete: Home loaded.");
    } catch {
      logger.debug("WebViewBridge", "Session wash timed out or failed, proceeding anyway.");
    }
    // -------------------------

    const promise = this.timeoutPromise(requestId, TIMEOUTS.DECRYPTION);

    // Now navigate to the actual video URL
    logger.debug("WebViewBridge", `Navigating to video URL: ${videoUrl}`);
    this.navigateFn(videoUrl);

    // Inject JWPlayer extraction scripts at staggered delays
    this.scheduleJwplayerExtraction(requestId);

    const result = await promise;
    this.currentRequestId = null; // Clear current request after resolution
    return result;
  }

  // ─── Private helpers ─────────────────────────────────────────────────
  /**
   * Returns a promise that resolves when a matching message arrives,
   * or rejects after the given timeout.
   */
  private timeoutPromise(requestId: string, timeoutMs: number): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      this.activeDecryptions.set(requestId, resolve);
      setTimeout(() => {
        if (this.activeDecryptions.has(requestId)) {
          this.activeDecryptions.delete(requestId);
          resolve(null);
        }
      }, timeoutMs);
    });
  }

  /**
   * Waits for the notifyPageLoaded event to be triggered.
   */
  private waitForPageLoad(timeoutMs: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pageLoadResolver = null;
        reject(new Error("Page load timeout"));
      }, timeoutMs);

      this.pageLoadResolver = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }

  /**
   * Schedules JWPlayer extraction script injections at staggered delays.
   */
  private scheduleJwplayerExtraction(requestId: string) {
    for (const delay of TIMEOUTS.JWPLAYER_DELAYS) {
      setTimeout(() => {
        if (this.injectFn && this.activeDecryptions.has(requestId)) {
          this.injectFn(JWPLAYER_EXTRACT_JS);
        }
      }, delay);
    }
  }
}
