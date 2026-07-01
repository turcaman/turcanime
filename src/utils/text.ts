export function cleanTitle(raw: string): string {
  return raw.replace(/^Ver\s+/i, "").replace(/\s+Sub\s+.*$/i, "").trim();
}
