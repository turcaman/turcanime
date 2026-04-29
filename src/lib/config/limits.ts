/**
 * System limits configuration.
 * Centralized so limits can be tuned without touching business logic.
 */

/** Cache limits */
export const LIMITS = {
  /** Maximum size per cache entry in bytes (1MB) */
  CACHE_MAX_ENTRY_SIZE: 1024 * 1024,
  
  /** Maximum number of cached items */
  CACHE_MAX_ENTRIES: 200,
  
  /** Percentage of oldest entries to remove when cache is full (20%) */
  CACHE_CLEANUP_PERCENTAGE: 0.2,
} as const;

/** Logging limits */
export const LOG_LIMITS = {
  /** Maximum number of log entries to keep in memory */
  MAX_ENTRIES: 1000,
} as const;

/** Performance limits */
export const PERF_LIMITS = {
  /** Maximum sample size for site version detection (characters) */
  SITE_VERSION_SAMPLE_SIZE: 5000,
} as const;
