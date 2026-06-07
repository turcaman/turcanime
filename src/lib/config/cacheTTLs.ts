/**
 * Cache TTL (time-to-live) configuration in milliseconds.
 * Centralized so TTLs can be tuned without touching store logic.
 */

export const ANIME_CACHE = {
  HOME: 6 * 60 * 60 * 1000,
  SEARCH: 30 * 60 * 1000,
  SUGGESTIONS: 30 * 60 * 1000,
  DETAILS: 12 * 60 * 60 * 1000,
} as const;

export const PLAYER_CACHE = {
  SERVERS: 2 * 60 * 60 * 1000,
  STREAM_URL: 2 * 60 * 60 * 1000,
} as const;
