/** Cache key prefixes */
export const CACHE_PREFIXES = {
  HOME: "ch_home",
  SEARCH: "search",
  SUGGESTIONS: "suggestions",
  DETAILS: "anime",
  STREAM: "stream",
  SERVERS: "servers",
} as const;

/** Cache TTLs in milliseconds */
export const CACHE_TTL = {
  HOME: 6 * 60 * 60 * 1000,
  SEARCH: 30 * 60 * 1000,
  SUGGESTIONS: 5 * 60 * 1000,
  DETAILS: 12 * 60 * 60 * 1000,
  SERVERS: 10 * 60 * 1000,
  STREAM: 5 * 60 * 1000,
} as const;

/** System limits */
export const LIMITS = {
  CACHE_MAX_ENTRY_SIZE: 1024 * 1024, // 1MB
} as const;

export const LOG_LIMITS = {
  MAX_ENTRIES: 1000,
} as const;

/** Timeouts */
export const TIMEOUTS = {
  SEARCH: 15000,
  SESSION_INIT: 30000,
  RETRY_DELAY: 1000,
} as const;
