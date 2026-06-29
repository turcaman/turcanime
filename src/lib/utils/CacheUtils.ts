/**
 * Cache utility functions for consistent cache key generation and management
 */

export function encodeCacheKey(str: string): string {
  const sanitized = str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');

  // FNV-1a 32-bit hash for better distribution
  let hash = 0x811c9dc5;
  for (let i = 0; i < sanitized.length; i++) {
    hash ^= sanitized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return `${sanitized.slice(0, 40)}_${Math.abs(hash).toString(36)}`;
}

export function createCacheKey(prefix: string, identifier: string): string {
  return `${prefix}_${encodeCacheKey(identifier)}`;
}
