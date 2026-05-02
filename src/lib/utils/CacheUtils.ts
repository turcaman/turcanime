/**
 * Cache utility functions for consistent cache key generation and management
 */

export function encodeCacheKey(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') // Collapse multiple underscores
    .slice(0, 50); // Limit length to prevent excessively long keys
}

export function createCacheKey(prefix: string, identifier: string): string {
  return `${prefix}_${encodeCacheKey(identifier)}`;
}

export interface CacheOptions<T> {
  cacheKey: string;
  cacheTtl: number;
  errorMessage: string;
  fetchFn: (signal: AbortSignal) => Promise<T>;
  force?: boolean;
}
