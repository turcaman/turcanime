import type { ISession, IWebViewBridge, WebViewMessageData } from "../../domain/interfaces";
import { logger } from "../../utils/logger";

type NavigateFn = (uri: string) => void;

export class WebViewBridge implements IWebViewBridge {
  private navigateFn: NavigateFn | null = null;
  private pageLoadResolver: ((value: void) => void) | null = null;
  private bridgeResolve: ((url: string) => void) | null = null;
  private bridgeReject: ((err: Error) => void) | null = null;
  private bridgeTimer: ReturnType<typeof setTimeout> | null = null;

  registerNavigation(fn: NavigateFn) { this.navigateFn = fn; }

  navigateTo(uri: string): void {
    if (this.navigateFn) {
      logger.info("WebViewBridge", `Navigating to ${uri.slice(0, 80)}...`);
      this.navigateFn(uri);
    }
  }

  notifyPageLoaded() {
    if (this.pageLoadResolver) {
      this.pageLoadResolver();
      this.pageLoadResolver = null;
    }
  }

  async fetchViaWebView(url: string, timeout = 30000): Promise<string> {
    logger.info("WebViewBridge", `fetchViaWebView: ${url.slice(0, 80)}...`);

    if (this.bridgeReject) {
      this.bridgeReject(new Error("Bridge request superseded"));
      this.clearBridge();
    }

    return new Promise((resolve, reject) => {
      this.bridgeResolve = resolve;
      this.bridgeReject = reject;

      this.bridgeTimer = setTimeout(() => {
        logger.warn("WebViewBridge", `Bridge timeout for ${url.slice(0, 80)}`);
        this.clearBridge();
        reject(new Error(`Bridge timeout: ${url.slice(0, 80)}`));
      }, timeout);

      this.navigateTo(url);
    });
  }

  hasPendingBridgeRequest(): boolean {
    return this.bridgeResolve != null;
  }

  resolveBridge(url: string): void {
    logger.info("WebViewBridge", `Bridge resolved: ${url.slice(0, 100)}`);
    if (this.bridgeTimer) clearTimeout(this.bridgeTimer);
    const resolve = this.bridgeResolve;
    this.clearBridge();
    resolve?.(url);
  }

  rejectBridge(error: string): void {
    logger.warn("WebViewBridge", `Bridge rejected: ${error}`);
    if (this.bridgeTimer) clearTimeout(this.bridgeTimer);
    const reject = this.bridgeReject;
    this.clearBridge();
    reject?.(new Error(error));
  }

  private clearBridge(): void {
    this.bridgeResolve = null;
    this.bridgeReject = null;
    this.bridgeTimer = null;
  }

  handleMessage(message: string): { type: string; data: WebViewMessageData } | null {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type == null && typeof parsed === "object") return this.handleLegacyMessage(parsed);
      return { type: parsed.type, data: parsed.data };
    } catch {
      return null;
    }
  }

  private handleLegacyMessage(parsed: unknown): { type: string; data: WebViewMessageData } | null {
    if (typeof parsed === "string") return { type: "RAW", data: { type: "RAW", data: parsed } };

    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      if ("cookies" in obj && "userAgent" in obj) {
        return { type: "SESSION", data: { type: "SESSION", session: obj as unknown as ISession } };
      }
    }
    return null;
  }
}
