import type { AppError, AppErrorType } from "../types";

export class SourceError extends Error implements AppError {
  type: AppErrorType;
  constructor(message: string, type: AppErrorType = "UNKNOWN") {
    super(message);
    this.type = type;
    this.name = "SourceError";
  }
}

export function isAuthError(error: unknown): error is { type: "AUTH_ERROR" } {
  return (error as { type?: string })?.type === "AUTH_ERROR";
}
