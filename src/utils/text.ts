/**
 * Text utility functions for string manipulation.
 */

/**
 * Clean anime title by removing common prefixes and suffixes.
 * Removes "Ver " prefix and " Sub ..." suffix patterns.
 */
export function cleanTitle(raw: string): string {
  return raw.replace(/^Ver\s+/i, "").replace(/\s+Sub\s+.*$/i, "").trim();
}
