/**
 * Structured logger with levels and persistence.
 * Logs are persisted to storage in production for debugging.
 */

import { LOG_LIMITS } from "../config/limits";
import { IStorage } from "../domain/interfaces";

declare const __DEV__: boolean | undefined;

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  tag: string;
  message: string;
  error?: string;
}

const LOG_STORAGE_KEY = "app_logs";
const MAX_LOG_ENTRIES = LOG_LIMITS.MAX_ENTRIES;
const DEFAULT_LOG_LEVEL = (typeof __DEV__ !== 'undefined' && __DEV__) ? LogLevel.DEBUG : LogLevel.WARN;

class Logger {
  private logLevel: LogLevel = DEFAULT_LOG_LEVEL;
  private logs: LogEntry[] = [];
  private persistenceEnabled = !(typeof __DEV__ !== 'undefined' && __DEV__); // Only persist in production
  private storage: IStorage | null = null;

  setStorage(storage: IStorage): void {
    this.storage = storage;
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private format(level: LogLevel, tag: string, message: string): string {
    const levelStr = LogLevel[level];
    return `[${levelStr}] [${tag}] ${message}`;
  }

  private async persist(entry: LogEntry): Promise<void> {
    if (!this.persistenceEnabled || !this.storage) return;

    this.logs = [...this.logs, entry];
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-MAX_LOG_ENTRIES); // Keep last N
    }

    try {
      await this.storage.set(LOG_STORAGE_KEY, this.logs);
    } catch {
      // Silent fail - logging shouldn't break the app
    }
  }

  debug(tag: string, message: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.log(this.format(LogLevel.DEBUG, tag, message));
    this.persist({ timestamp: Date.now(), level: LogLevel.DEBUG, tag, message });
  }

  info(tag: string, message: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.log(this.format(LogLevel.INFO, tag, message));
    this.persist({ timestamp: Date.now(), level: LogLevel.INFO, tag, message });
  }

  warn(tag: string, message: string, error?: unknown): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const errorStr = error ? this.serializeError(error) : undefined;
    console.warn(this.format(LogLevel.WARN, tag, message), error || "");
    this.persist({ timestamp: Date.now(), level: LogLevel.WARN, tag, message, error: errorStr });
  }

  error(tag: string, message: string, error?: unknown): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const errorStr = error ? this.serializeError(error) : undefined;
    console.error(this.format(LogLevel.ERROR, tag, message), error || "");
    this.persist({ timestamp: Date.now(), level: LogLevel.ERROR, tag, message, error: errorStr });
  }

  private serializeError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}\n${error.stack || ""}`;
    }
    return String(error);
  }

  async getLogs(): Promise<LogEntry[]> {
    if (!this.persistenceEnabled || !this.storage) return [];
    try {
      return await this.storage.get<LogEntry[]>(LOG_STORAGE_KEY) || [];
    } catch {
      return [];
    }
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
    if (!this.persistenceEnabled || !this.storage) return;
    try {
      await this.storage.remove(LOG_STORAGE_KEY);
    } catch {
      // Silent fail
    }
  }
}

export const logger = new Logger();

// Backward compatibility with existing code
export function log(tag: string, msg: string, error?: unknown): void {
  if (error) {
    logger.warn(tag, msg, error);
  } else {
    logger.info(tag, msg);
  }
}
