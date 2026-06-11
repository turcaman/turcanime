import { TIMEOUTS } from "../../config/timeouts";
import type { ISession, IWebViewBridge, WebViewMessageData } from "../../domain/interfaces";
import { InjectionService } from "./bridge/InjectionService";
import { StreamResolver } from "./bridge/StreamResolver";
import { MessageRouter } from "./bridge/MessageRouter";

type NavigateFn = (uri: string) => void;

/**
 * Bridges React Native with WebView for stream URL extraction.
 *
 * Flow: navigate to video page → inject JS to extract iframe → poll for result → resolve URL.
 * Uses a Map of pending requests with timeouts to handle async decryption.
 * Supports both iframe-based (Delta server) and HLS direct streams.
 */
export class WebViewBridge implements IWebViewBridge {
  private activeDecryptions = new Map<string, (url: string | null) => void>();
  private navigateFn: NavigateFn | null = null;
  private pageLoadResolver: ((value: void) => void) | null = null;
  
  private injectionService: InjectionService;
  private streamResolver: StreamResolver;
  private messageRouter: MessageRouter;

  constructor() {
    this.injectionService = new InjectionService();
    this.streamResolver = new StreamResolver((code) => { this.injectFn(code); });
    this.messageRouter = new MessageRouter(
      this.activeDecryptions,
      (url) => { this.handleEmbedUrl(url); }
    );
  }

  private injectFn(code: string): void {
    if (this._injectFn) this._injectFn(code);
  }
  private _injectFn: ((code: string) => void) | null = null;

  registerNavigation(fn: NavigateFn) { this.navigateFn = fn; }
  registerInjection(fn: (code: string) => void) { this._injectFn = fn; }

  navigateTo(uri: string): void {
    if (this.navigateFn) {
      this.navigateFn(uri);
    }
  }

  notifyPageLoaded() {
    if (this.pageLoadResolver) {
      this.pageLoadResolver();
      this.pageLoadResolver = null;
    }
  }

  handleMessage(message: string): { type: string; data: WebViewMessageData } | null {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type == null && typeof parsed === "object") return this.handleLegacyMessage(parsed);

      this.messageRouter.handle({ type: parsed.type, payload: parsed.data });

      return { type: parsed.type, data: parsed.data };
    } catch {
      return null;
    }
  }

  private handleEmbedUrl(url: string) {
    const lastRequestId = Array.from(this.activeDecryptions.keys()).pop();
    if (lastRequestId != null) {
      const autoResolve = this.activeDecryptions.get(lastRequestId);
      if (autoResolve) {
        this.activeDecryptions.delete(lastRequestId);
        autoResolve(url);
      }
    }
  }

  private handleLegacyMessage(parsed: unknown): { type: string; data: WebViewMessageData } | null {
    if (typeof parsed === "string") return { type: "RAW", data: { type: "RAW", data: parsed } };

    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      if ("id" in obj && "data" in obj) {
        return { type: "DECRYPTION_RESULT", data: { type: "DECRYPTION_RESULT", id: String(obj.id), data: obj.data as string | null, error: "error" in obj ? String(obj.error) : undefined } };
      }
      if ("cookies" in obj && "userAgent" in obj) {
        return { type: "SESSION", data: { type: "SESSION", session: obj as unknown as ISession } };
      }
    }
    return null;
  }

  async resolveStreamUrl(videoUrl: string, episodeUrl?: string): Promise<string | null> {
    if (!this.navigateFn) throw new Error("WebView navigation not registered");
    const requestId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.clearPendingRequests();

    this.navigateFn(this.extractOrigin(videoUrl));
    try { await this.waitForPageLoad(TIMEOUTS.PAGE_LOAD); } catch {}

    if (episodeUrl != null) {
      this.navigateFn(episodeUrl);
      try { await this.waitForPageLoad(TIMEOUTS.EPISODE_PAGE_LOAD); } catch {}
    }

    const promise = this.timeoutPromise(requestId, TIMEOUTS.DECRYPTION);
    this.navigateFn(videoUrl);
    
    await this.streamResolver.pollForExtraction(
      requestId,
      (id) => this.activeDecryptions.has(id),
      this.injectionService.getIframeExtractJs(),
      "Iframe"
    );

    return await promise;
  }

  private extractOrigin(url: string): string {
    try { return new URL(url).origin; } catch { return ""; }
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
      const timer = setTimeout(() => { this.pageLoadResolver = null; reject(new Error("Page load timeout")); }, timeoutMs);
      this.pageLoadResolver = () => { clearTimeout(timer); resolve(); };
    });
  }

  async resolveEmbedStreamUrl(embedUrl: string): Promise<string | null> {
    if (!this.navigateFn) throw new Error("WebView navigation not registered");
    const requestId = `embed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.clearPendingRequests();

    const promise = this.timeoutPromise(requestId, TIMEOUTS.DECRYPTION);
    this.navigateFn(embedUrl);
    try { await this.waitForPageLoad(TIMEOUTS.EMBED_PAGE_LOAD); } catch {}

    await this.streamResolver.pollForExtraction(
      requestId,
      (id) => this.activeDecryptions.has(id),
      this.injectionService.getHlsExtractJs(),
      "HLS"
    );

    return await promise;
  }
}
