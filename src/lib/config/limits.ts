/**
 * System limits configuration.
 * Centralized so limits can be tuned without touching business logic.
 */

export const LIMITS = {
  CACHE_MAX_ENTRY_SIZE: 1024 * 1024,
  CACHE_MAX_ENTRIES: 200,
  CACHE_CLEANUP_PERCENTAGE: 0.2,
} as const;

export const LOG_LIMITS = {
  MAX_ENTRIES: 1000,
} as const;

export const PERF_LIMITS = {
  SITE_VERSION_SAMPLE_SIZE: 5000,
} as const;
