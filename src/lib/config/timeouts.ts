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
  
  /** Delays for JWPlayer extraction script injections (staggered) */
  JWPLAYER_DELAYS: [1500, 3000, 5000] as const,
  
  /** Max time to wait for stream decryption */
  DECRYPTION: 30000,
} as const;
