import type { AppError, AppErrorType } from "../types";

export class SourceError extends Error implements AppError {
  type: AppErrorType;
  constructor(message: string, type: AppErrorType = "UNKNOWN") {
    super(message);
    this.type = type;
    this.name = "SourceError";
  }
}
