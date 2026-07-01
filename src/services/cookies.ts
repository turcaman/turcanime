/**
 * Extract raw cookie string from a potentially JSON-wrapped value.
 */
export function unwrapCookies(rawCookies: string): string {
  try {
    const parsed = JSON.parse(rawCookies);
    return parsed.raw ?? "";
  } catch {
    return rawCookies;
  }
}

export function mergeCookies(existing: string, setCookieHeaders: string[]): string {
  const map = new Map<string, string>();

  for (const pair of existing.split(";")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const name = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (name) map.set(name, value);
  }

  for (const header of setCookieHeaders) {
    const semiIdx = header.indexOf(";");
    const nv = semiIdx === -1 ? header.trim() : header.slice(0, semiIdx).trim();
    const eqIdx = nv.indexOf("=");
    if (eqIdx === -1) continue;
    const name = nv.slice(0, eqIdx).trim();
    const value = nv.slice(eqIdx + 1).trim();
    if (name) map.set(name, value);
  }

  return Array.from(map.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}
