export const CACHE_PREFIXES = {
  HOME: "ch_home",
  SEARCH: "search",
  ANIME: "anime",
  STREAM: "stream",
  SERVERS: "servers",
} as const;

// Effective TTLs are ~70% of these values: withCache treats the last 30% of
// the window as stale and refetches (HOME expires at 4.2h, DETAILS at 8.4h).
// Set the number here to the full window you want, not the effective one.
export const CACHE_TTL = {
  HOME: 6 * 60 * 60 * 1000,
  SEARCH: 30 * 60 * 1000,
  DETAILS: 12 * 60 * 60 * 1000,
  SERVERS: 10 * 60 * 1000,
  STREAM: 5 * 60 * 1000,
} as const;

export const LIMITS = {
  CACHE_MAX_ENTRY_SIZE: 1024 * 1024, // 1MB
} as const;

export const LOG_LIMITS = {
  MAX_ENTRIES: 1000,
} as const;

export const TIMEOUTS = {
  REQUEST_TIMEOUT: 30_000,
  UPDATE_CHECK: 10_000,
  MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY: 1_000,
  RETRY_MAX_DELAY: 4_000,
} as const;
