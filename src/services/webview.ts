import { logger } from "../utils/logger";

type NavigateFn = (uri: string) => void;

class WebViewBridge {
  private navigateFn: NavigateFn | null = null;

  registerNavigation(fn: NavigateFn) {
    this.navigateFn = fn;
  }

  navigateTo(uri: string): void {
    if (this.navigateFn) {
      logger.info("WebViewBridge", `Navigating to ${uri.slice(0, 80)}...`);
      this.navigateFn(uri);
    }
  }

  handleMessage(message: string): { type: string; data: unknown } | null {
    try {
      const parsed = JSON.parse(message);
      return { type: parsed.type, data: parsed.data };
    } catch {
      return null;
    }
  }
}

export const webViewBridge = new WebViewBridge();
