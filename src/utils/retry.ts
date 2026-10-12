import { logger } from "./logger";
import { isAuthError, toAppError } from "./errors";
import { backoffDelay } from "./math";
import { refreshSession } from "../services/session";

interface WithAuthRetryOptions {
  /** Optional caller signal for cooperative abort between attempts */
  signal?: AbortSignal;
  /** Extra predicate when the caller carries its own superseded-state (e.g. local AbortController) */
  isAborted?: () => boolean;
  /** Total attempts including the first; 1 disables retry */
  maxRetries?: number;
  /** Tag for logs; errors propagate to the caller regardless */
  tag: string;
}

/**
 * Single ladder for every store. On AUTH_ERROR refreshes the session and
 * retries with backoff; a failed refresh never stops the ladder — the fresh
 * challenge may still land, so the next attempt decides. Non-auth errors
 * propagate immediately. Abort checks stay with the caller.
 */
export async function withAuthRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: WithAuthRetryOptions,
): Promise<T> {
  const { signal, isAborted, maxRetries = 1, tag } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted || isAborted?.()) {
      logger.debug(tag, "Aborted before attempt, stopping ladder");
      const abort = new Error("aborted");
      abort.name = "AbortError";
      throw abort;
    }
    const startedAt = Date.now();
    try {
      const result = await operation(attempt);
      if (attempt > 0) logger.info(tag, `Retry ${attempt} succeeded`);
      return result;
    } catch (error) {
      lastError = error;
      const elapsedMs = Date.now() - startedAt;
      if (!isAuthError(error) || attempt >= maxRetries) {
        logger.warn(tag, `Settled ${toAppError(error).type} in ${elapsedMs}ms (attempt ${attempt})`, error);
        throw error;
      }
      logger.info(tag, `Auth error, refreshing session and retrying (${attempt + 1}/${maxRetries})...`);
      try {
        await refreshSession();
      } catch (refreshError) {
        logger.warn(tag, "Session refresh threw, next attempt decides", refreshError);
      }
      await new Promise((resolve) => setTimeout(resolve, backoffDelay(attempt)));
    }
  }
  throw lastError;
}
