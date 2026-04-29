/**
 * Cache TTL (time-to-live) configuration in milliseconds.
 * Centralized so TTLs can be tuned without touching store logic.
 */

/** Anime content — rarely changes, long-lived cache */
export const ANIME_CACHE = {
  HOME: 6 * 60 * 60 * 1000,        // 6h
  SEARCH: 30 * 60 * 1000,          // 30min
  SUGGESTIONS: 30 * 60 * 1000,     // 30min
  DETAILS: 12 * 60 * 60 * 1000,    // 12h
} as const;

/** Player/stream — short-lived, embeds expire quickly */
export const PLAYER_CACHE = {
  SERVERS: 2 * 60 * 60 * 1000,      // 2h
  STREAM_URL: 2 * 60 * 60 * 1000,   // 2h
} as const;
