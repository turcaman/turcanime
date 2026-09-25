import { logger } from "./logger";
import { isAuthError } from "./errors";
import { backoffDelay } from "./math";
import { refreshSession } from "../services/session";

interface WithAuthRetryOptions {
  /** Optional caller signal for cooperative abort between attempts */
  signal?: AbortSignal;
  /** Extra predicate when the caller carries its own superseded-state (e.g. local AbortController) */
  isAborted?: () => boolean;
  /** Total attempts including the first; 1 disables retry */
  maxRetries?: number;
  /**
   * homeStore keeps retrying even when the refresh itself fails (the fresh
   * challenge may still land). Everywhere else a failed refresh stops the
   * ladder with a SessionRefreshError.
   */
  continueAfterRefreshFailure?: boolean;
  /** Tag for logs; errors propagate to the caller regardless */
  tag: string;
}

/** Thrown when the session refresh itself fails and the ladder stops */
export class SessionRefreshError extends Error {
  constructor() {
    super("Error al renovar sesión");
    this.name = "SessionRefreshError";
  }
}

/**
 * Runs `operation`, and on AUTH_ERROR refreshes the session and retries with
 * backoff. Non-auth errors propagate immediately. Abort checks and cooldown
 * state stay with the caller — this only owns the refresh-and-retry ladder
 * shared by every store/hook.
 */
export async function withAuthRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: WithAuthRetryOptions,
): Promise<T> {
  const { signal, isAborted, maxRetries = 1, continueAfterRefreshFailure = false, tag } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted || isAborted?.()) {
      const abort = new Error("aborted");
      abort.name = "AbortError";
      throw abort;
    }
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (!isAuthError(error) || attempt >= maxRetries) throw error;
      logger.info(tag, `Auth error, refreshing session and retrying (${attempt + 1}/${maxRetries})...`);
      try {
        await refreshSession();
      } catch (refreshError) {
        if (continueAfterRefreshFailure) {
          logger.warn(tag, "Session refresh threw, continuing retry anyway", refreshError);
        } else {
          throw new SessionRefreshError();
        }
      }
      await new Promise((resolve) => setTimeout(resolve, backoffDelay(attempt)));
    }
  }
  throw lastError;
}
