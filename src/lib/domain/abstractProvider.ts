/**
 * Abstract base class for content providers.
 * Provides shared fetchWithSession logic, ensuring consistent
 * session handling (User-Agent, cookies, referer) across all providers.
 */
import { TIMEOUTS } from "../config/timeouts";
import { log } from "../utils/logger";
import { ISessionManager } from "./interfaces";

export abstract class AbstractProvider {
  private authErrorCount = 0;
  private authErrorTimestamp = 0;

  constructor(
    protected sessionManager: ISessionManager,
    protected baseUrl: string
  ) {}

  /**
   * Perform a fetch request with session headers (User-Agent, cookies, referer).
   */
  protected async fetchWithSession(path: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
    // Wait for cookies to be ready from WebView (max 5s)
    await this.sessionManager.waitForCookies();

    const session = await this.sessionManager.getSession();

    // Extract raw cookies from JSON wrapper (if present) or use as-is
    let rawCookies = session?.cookies || "";
    try {
      const parsed = JSON.parse(rawCookies);
      rawCookies = parsed.raw || "";
    } catch {
      // Already raw string, use as-is
    }

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      "User-Agent": session?.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Cookie": rawCookies,
      "Referer": this.baseUrl + "/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      // Removed Accept-Encoding to avoid gzip compression issues with React Native fetch
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
    };

    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;

    try {
      const res = await fetch(url, { ...options, headers, signal: options.signal });

      if (!res.ok) {
        log("fetch", `HTTP ${res.status} for ${url}`);

        // Track auth errors for session invalidation
        if (this.isAuthError(res.status)) {
          if (this.authErrorCount === 0) {
            this.authErrorTimestamp = Date.now();
          }
          this.authErrorCount++;

          if (this.shouldInvalidateSession()) {
            log("fetch", `Session invalidation triggered after ${this.authErrorCount} auth errors`);
            const error = new Error("Authentication failed - session invalid") as Error & { type: string };
            error.type = "AUTH_ERROR";
            throw error;
          }
        }

        // Smart retry: only for 403 (blocked), not for 500 (server errors)
        // Only retry critical paths (homepage, main listings)
        if (res.status === 403 && retryCount < 1 && this.isCriticalPath(path)) {
          log("fetch", `Smart retry (1/1) for 403 on critical path: ${url}`);
          await new Promise(resolve => setTimeout(resolve, TIMEOUTS.RETRY_DELAY));
          return this.fetchWithSession(path, options, retryCount + 1);
        }
      }
      return res;
    } catch (error) {
      // Don't retry if aborted
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      log("fetch", `Network error for ${url}`, error);
      // Retry network errors on critical paths
      if (retryCount < 1 && this.isCriticalPath(path)) {
        log("fetch", `Smart retry (1/1) for network error on critical path: ${url}`);
        await new Promise(resolve => setTimeout(resolve, TIMEOUTS.RETRY_DELAY));
        return this.fetchWithSession(path, options, retryCount + 1);
      }
      throw error;
    }
  }

  private isCriticalPath(path: string): boolean {
    // Only retry on critical paths that users see immediately
    const criticalPaths = ['/', '/animes/populares', '/animes/mas-vistos'];
    return criticalPaths.some(criticalPath => path.includes(criticalPath));
  }

  private isAuthError(status: number): boolean {
    return status === 403 || status === 401;
  }

  private shouldInvalidateSession(): boolean {
    const now = Date.now();
    const timeSinceFirstError = now - this.authErrorTimestamp;

    // Reset counter if more than 30s passed
    if (timeSinceFirstError > 30000) {
      this.authErrorCount = 0;
      return false;
    }

    // Invalidate if 3+ errors in 30s
    return this.authErrorCount >= 3;
  }
}
