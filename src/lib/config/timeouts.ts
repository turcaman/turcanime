/**
 * Timeout configuration in milliseconds.
 * Centralized so timeouts can be tuned without touching business logic.
 */

export const TIMEOUTS = {
  SEARCH: 15000,
  SESSION_INIT: 30000,
  RETRY_DELAY: 1000,
  PAGE_LOAD: 3000,
  EPISODE_PAGE_LOAD: 5000,
  EMBED_PAGE_LOAD: 5000,
  IFRAME_POLL_INTERVAL: 500,
  IFRAME_POLL_MAX_ATTEMPTS: 20,
  DECRYPTION: 30000,
} as const;
