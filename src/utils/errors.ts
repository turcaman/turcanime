import type { AppError, AppErrorType } from "../types";

export class SourceError extends Error implements AppError {
  type: AppErrorType;
  constructor(message: string, type: AppErrorType = "UNKNOWN") {
    super(message);
    this.type = type;
    this.name = "SourceError";
  }
}

/**
 * Thrown when a request was aborted or superseded by a newer one. It is never
 * a load failure: no UI may ever render an error state from it.
 */
export class CancelledError extends Error {
  constructor(message = "Request cancelled") {
    super(message);
    this.name = "CancelledError";
  }
}

/** True for every cancellation shape the platform and our code can produce */
export function isCancelled(error: unknown): boolean {
  if (error instanceof CancelledError) return true;
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}

const APP_ERROR_TYPES: readonly AppErrorType[] = [
  "NETWORK_ERROR",
  "AUTH_ERROR",
  "TIMEOUT",
  "VIDEO_ERROR",
  "PARSER_ERROR",
  "UNKNOWN",
];

/** Single mapping from any thrown value to the AppError the UI renders */
export function toAppError(error: unknown): AppError {
  if (error instanceof Error) {
    const type = (error as { type?: unknown }).type;
    if (typeof type === "string" && APP_ERROR_TYPES.includes(type as AppErrorType)) {
      return { type: type as AppErrorType, message: error.message };
    }
    return { type: "UNKNOWN", message: error.message };
  }
  return { type: "UNKNOWN", message: String(error) };
}

export function isAuthError(error: unknown): error is { type: "AUTH_ERROR" } {
  return (error as { type?: string })?.type === "AUTH_ERROR";
}
