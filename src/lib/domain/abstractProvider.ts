/**
 * Abstract base class for content providers.
 * Provides shared fetchWithSession logic, ensuring consistent
 * session handling (User-Agent, cookies, referer) across all providers.
 */
import { TIMEOUTS } from "../config/timeouts";
import { log } from "../utils/logger";
import type { ISessionManager } from "./interfaces";

export abstract class AbstractProvider {
  constructor(
    protected sessionManager: ISessionManager,
    protected baseUrl: string
  ) {}

  /**
   * Perform a fetch request with session headers (User-Agent, cookies, referer).
   */
  protected async fetchWithSession(path: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
    await this.sessionManager.waitForCookies();

    const session = await this.sessionManager.getSession();

    let rawCookies = session?.cookies ?? "";
    try {
      const parsed = JSON.parse(rawCookies);
      rawCookies = parsed.raw ?? "";
    } catch {
    }

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      "User-Agent": session?.userAgent ?? "",
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

        if (this.isAuthError(res.status)) {
          log("fetch", "Auth error detected, triggering session invalidation");
          const error = new Error("Authentication failed - session invalid") as Error & { type: string };
          error.type = "AUTH_ERROR";
          throw error;
        }

        // Retry 403/network errors once on any path (not just critical)
        if (retryCount < 1) {
          log("fetch", `Smart retry (1/1) for HTTP ${res.status}: ${url}`);
          await new Promise(resolve => setTimeout(resolve, TIMEOUTS.RETRY_DELAY));
          return this.fetchWithSession(path, options, retryCount + 1);
        }
      }
      return res;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      log("fetch", `Network error for ${url}`, error);
      if (retryCount < 1) {
        log("fetch", `Smart retry (1/1) for network error: ${url}`);
        await new Promise(resolve => setTimeout(resolve, TIMEOUTS.RETRY_DELAY));
        return this.fetchWithSession(path, options, retryCount + 1);
      }
      throw error;
    }
  }

  private isAuthError(status: number): boolean {
    return status === 403 || status === 401;
  }
}
