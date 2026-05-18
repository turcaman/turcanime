/**
 * Cache utility functions for consistent cache key generation and management
 */

export function encodeCacheKey(str: string): string {
  const sanitized = str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_'); // Collapse multiple underscores

  // Generate a hash to ensure uniqueness for long strings
  let hash = 0;
  for (let i = 0; i < sanitized.length; i++) {
    hash = ((hash << 5) - hash) + sanitized.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  // Combine truncated sanitized string with hash to keep keys manageable but unique
  return `${sanitized.slice(0, 40)}_${Math.abs(hash).toString(36)}`;
}

export function createCacheKey(prefix: string, identifier: string): string {
  return `${prefix}_${encodeCacheKey(identifier)}`;
}
