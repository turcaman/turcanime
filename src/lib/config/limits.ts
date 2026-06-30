/**
 * System limits configuration.
 * Centralized so limits can be tuned without touching business logic.
 */

export const LIMITS = {
  CACHE_MAX_ENTRY_SIZE: 1024 * 1024,
} as const;

export const LOG_LIMITS = {
  MAX_ENTRIES: 1000,
} as const;
