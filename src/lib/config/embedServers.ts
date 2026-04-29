/**
 * Embed server configurations — known domains and their required headers.
 * Add new entries here when supporting new embed providers.
 */

/** Map of embed domain substrings to their required Referer header. */
export const EMBED_REFERER: ReadonlyMap<string, string> = new Map([
  ["yourupload.com", "https://www.yourupload.com/"],
  ["voe.sx", "https://voe.sx/"],
  ["hqq.tv", "https://hqq.tv/"],
  ["vgfplay.com", "https://vgfplay.com/"],
  ["vidguard", "https://vgfplay.com/"],
  ["mega.nz", "https://mega.nz/"],
  ["vidcache.net", "https://www.yourupload.com/"],
]);

/**
 * Find the required Referer for a given video URL.
 * Returns empty string if no referer is needed.
 */
export function getRequiredReferer(url: string): string {
  try {
    const { hostname } = new URL(url);
    for (const [domain, referer] of EMBED_REFERER) {
      if (hostname.includes(domain)) return referer;
    }
  } catch { /* not a valid URL */ }
  return "";
}
