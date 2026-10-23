export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

declare const __DEV__: boolean | undefined;

const DEFAULT_LOG_LEVEL = (typeof __DEV__ !== "undefined" && __DEV__) ? LogLevel.DEBUG : LogLevel.WARN;

class Logger {
  // Level guide: debug = high-frequency flow (per request, cache hit/miss);
  // info = flow decisions (wash, ladder retries, settles); warn = degraded but
  // recovering; error = terminal or user-visible failure.
  private logLevel: LogLevel = DEFAULT_LOG_LEVEL;

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private format(level: LogLevel, tag: string, message: string): string {
    const now = new Date();
    const pad = (n: number, width = 2) => String(n).padStart(width, "0");
    const ts = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
    return `[${ts}] [${LogLevel[level]}] [${tag}] ${message}`;
  }

  debug(tag: string, message: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.log(this.format(LogLevel.DEBUG, tag, message));
  }

  info(tag: string, message: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.log(this.format(LogLevel.INFO, tag, message));
  }

  warn(tag: string, message: string, error?: unknown): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(this.format(LogLevel.WARN, tag, message), error ?? "");
  }

  error(tag: string, message: string, error?: unknown): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    console.error(this.format(LogLevel.ERROR, tag, message), error ?? "");
  }
}

export const logger = new Logger();
