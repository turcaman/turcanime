import { TIMEOUTS } from "../../config/timeouts";
import { ISession, IWebViewBridge, WebViewMessageData } from "../../domain/interfaces";
import { logger } from "../../utils/logger";
import { JWPLAYER_EXTRACT_JS } from "../webview/injectionScripts";
import { ANIMELATINO_CONFIG } from "../../config/providerConfigs";

// ─── Internal types ────────────────────────────────────────────────────

type NavigateFn = (uri: string) => void;
type Resolver = (url: string | null) => void;

/**
 * Manages the logic for interacting with the WebView worker.
 * Decoupled from the React component state to allow for easier testing.
 */
export class WebViewBridge implements IWebViewBridge {
  private activeDecryptions = new Map<string, Resolver>();
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
        return this.handleLegacyMessage(parsed);
      }

      const { type, data } = parsed;

      if (type === "DECRYPTION_RESULT") {
        let { id, data: url, error } = data;

        if (id === "stream_auto") {
          const lastRequestId = Array.from(this.activeDecryptions.keys()).pop();
          if (lastRequestId) {
            id = lastRequestId;
          }
        }

        const resolve = this.activeDecryptions.get(id);
        if (resolve) {
          this.activeDecryptions.delete(id);
          logger.debug("WebViewBridge", `DECRYPTION_RESULT for ${id}: ${url ? "OK" : "null"} ${error || ""}`);
          resolve(url || null);
        }
      }

      if (type === "EMBED_VIDEO_URL") {
        const lastRequestId = Array.from(this.activeDecryptions.keys()).pop();
        if (lastRequestId) {
          const autoResolve = this.activeDecryptions.get(lastRequestId);
          logger.debug("WebViewBridge", `EMBED_VIDEO_URL intercepted: ${data.url}, resolving request: ${lastRequestId}`);
          if (autoResolve) {
            this.activeDecryptions.delete(lastRequestId);
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
    if (typeof parsed === "string") {
      const data: WebViewMessageData = { type: "RAW", data: parsed };
      return { type: "RAW", data };
    }

    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;

      if ("id" in obj && "data" in obj) {
        const data: WebViewMessageData = {
          type: "DECRYPTION_RESULT",
          id: String(obj.id),
          data: obj.data as string | null,
          error: "error" in obj ? String(obj.error) : undefined,
        };
        return { type: "DECRYPTION_RESULT", data };
      }

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

  async resolveStreamUrl(videoUrl: string): Promise<string | null> {
    if (!this.navigateFn) throw new Error("WebView navigation not registered");

    const requestId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.clearPendingRequests();

    logger.debug("WebViewBridge", "Starting session wash: navigating to Home...");
    this.navigateFn(ANIMELATINO_CONFIG.sessionWashUrl);

    try {
      await this.waitForPageLoad(TIMEOUTS.PAGE_LOAD);
      logger.debug("WebViewBridge", "Session wash complete: Home loaded.");
    } catch {
      logger.debug("WebViewBridge", "Session wash timed out or failed, proceeding anyway.");
    }

    const promise = this.timeoutPromise(requestId, TIMEOUTS.DECRYPTION);

    logger.debug("WebViewBridge", `Navigating to video URL: ${videoUrl}`);
    this.navigateFn(videoUrl);

    this.scheduleJwplayerExtraction(requestId);

    const result = await promise;
    return result;
  }

  private clearPendingRequests(): void {
    for (const [id, resolve] of this.activeDecryptions) {
      resolve(null);
      this.activeDecryptions.delete(id);
    }
  }

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
