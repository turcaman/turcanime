import type { ISession, IWebViewBridge, WebViewMessageData } from "../../domain/interfaces";

type NavigateFn = (uri: string) => void;

/**
 * Bridges React Native with WebView for session management.
 */
export class WebViewBridge implements IWebViewBridge {
  private navigateFn: NavigateFn | null = null;
  private pageLoadResolver: ((value: void) => void) | null = null;

  registerNavigation(fn: NavigateFn) { this.navigateFn = fn; }

  navigateTo(uri: string): void {
    if (this.navigateFn) this.navigateFn(uri);
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
