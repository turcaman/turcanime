import type { AppError, AppErrorType } from "../types";

export class ProviderError extends Error implements AppError {
  type: AppErrorType;
  constructor(message: string, type: AppErrorType = "UNKNOWN") {
    super(message);
    this.type = type;
    this.name = "ProviderError";
  }
}
