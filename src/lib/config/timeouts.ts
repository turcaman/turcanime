/**
 * Timeout configuration in milliseconds.
 * Centralized so timeouts can be tuned without touching business logic.
 */

/** Network request timeouts */
export const TIMEOUTS = {
  /** Max time to wait for search results */
  SEARCH: 15000,

  /** Max time to wait for session initialization */
  SESSION_INIT: 30000,

  /** Delay before retry on network errors */
  RETRY_DELAY: 1000,

  /** Max time to wait for page load during session wash */
  PAGE_LOAD: 3000,

  /** Max time to wait for page load during episode page navigation */
  EPISODE_PAGE_LOAD: 5000,

  /** Max time to wait for embed player page to load and initialize video */
  EMBED_PAGE_LOAD: 5000,

  /** Polling interval for iframe extraction (ms) */
  IFRAME_POLL_INTERVAL: 500,

  /** Max polling attempts for iframe extraction */
  IFRAME_POLL_MAX_ATTEMPTS: 20,

  /** Max time to wait for stream decryption */
  DECRYPTION: 30000,
} as const;
