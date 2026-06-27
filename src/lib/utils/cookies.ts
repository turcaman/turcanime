/**
 * Extract raw cookie string from a potentially JSON-wrapped value.
 * Cookies are sometimes stored as JSON `{ raw: "...", siteVersion: "..." }`
 * to carry metadata alongside the raw cookie string.
 */
export function unwrapCookies(rawCookies: string): string {
  try {
    const parsed = JSON.parse(rawCookies);
    return parsed.raw ?? "";
  } catch {
    return rawCookies;
  }
}
