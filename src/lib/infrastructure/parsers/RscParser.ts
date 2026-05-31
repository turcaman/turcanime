import { log } from "../../utils/logger";
import { TMDB_IMAGE_BASE } from "../../config/images";
import type { IRscParser } from "../../domain/interfaces";

export interface RscExtractionResult {
  poster: string;
  synopsis: string | null;
}

export class RscParser implements IRscParser {
  parseRscPayload(text: string): string {
    const s = text.indexOf("([");
    const e = text.lastIndexOf("])");
    if (s === -1 || e === -1 || e <= s) return "";
    try {
      const slice = text.slice(s + 1, e + 1);
      const a = JSON.parse(slice);
      if (!Array.isArray(a) || typeof a[1] !== "string") {
        log("RscParser", "Unexpected RSC array format");
        return "";
      }
      return a[1];
    } catch (err: unknown) {
      log("RscParser", "JSON parse failed", err);
      return "";
    }
  }

  extractPosterUrl(rsc: string): string {
    const posterMatch = rsc.match(/"poster"\s*:\s*"([^"]+)"/);
    if (posterMatch) {
      const path = posterMatch[1]!;
      if (path.startsWith("http")) return path;
      if (path.startsWith("/")) return `${TMDB_IMAGE_BASE}${path}`;
    }

    const tmdbPattern = `${TMDB_IMAGE_BASE}/`;
    const idx = rsc.indexOf(tmdbPattern);
    if (idx !== -1) {
      const end = rsc.indexOf('"', idx + tmdbPattern.length);
      return end !== -1 ? rsc.slice(idx, end) : "";
    }

    return "";
  }

  extractSynopsis(rsc: string, fullHtml: string): string | null {
    // Primary: RSC page_overview with "children"
    const ovMatch = rsc.match(
      /page_overview__[^"]*"\s*,\s*"children"\s*:\s*"((?:\\.|[^"\\])*)"/
    );
    if (ovMatch) {
      const val = ovMatch[1]!;
      if (val.startsWith("$")) {
        // RSC reference — resolve the actual text
        const rid = val.slice(1);
        const resolved = this.resolveRscReference(fullHtml, rid);
        if (resolved != null && resolved.length > 20) return resolved;
      } else {
        // Direct text value
        try {
          const parsed = JSON.parse('"' + val + '"');
          if (typeof parsed === 'string' && parsed.length > 20) return parsed;
        } catch {
          if (val.length > 20) return val;
        }
      }
    }

    // Secondary: long text tuple — format: "N:Thex,text" or "N:T,text"
    const tMatch = rsc.match(/^\d+:T(?:\w+,)?([\s\S]+)$/);
    if (tMatch) {
      const candidate = tMatch[1]!;
      if (candidate.length > 30 && !candidate.startsWith("Ver ")) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Resolve RSC reference to actual text value.
   * Formats:
   *   "14:T41e,actual text here"
   *   "14:T,actual text"
   *   "abc123":T1,"text"
   */
  resolveRscReference(html: string, refId: string): string | null {
    try {
      // Format: "refId:Thex,text..." — most common in Next.js RSC
      const hexPattern = new RegExp(
        '"' + refId + ':T\\w+,((?:[^"\\\\]|\\\\.)*)"(?:,|$)'
      );
      const hexMatch = html.match(hexPattern);
      if (hexMatch) {
        let raw = hexMatch[1]!;
        raw = raw.replace(/\\\\/g, "\\").replace(/\\"/g, '"').replace(/\\n/g, "\n");
        return raw;
      }

      // Format: "refId":T\d+,"text" — fallback
      const refPattern = new RegExp(
        '"' + refId + '":\\s*T\\d+,"((?:[^"\\\\]|\\\\.)*)"'
      );
      const refMatch = html.match(refPattern);
      if (refMatch) {
        let raw = refMatch[1]!;
        raw = raw.replace(/\\\\/g, "\\").replace(/\\"/g, '"').replace(/\\n/g, "\n");
        return raw;
      }
    } catch (e: unknown) {
      log("RscParser", `Failed to resolve ref: ${refId}`, e);
    }
    return null;
  }

  parseAllFromScripts(
    html: string
  ): { poster: string; synopsis: string | null } {
    let poster = "";
    let synopsis: string | null = null;
    let synopsisLocked = false;

    const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
    for (const match of scripts) {
      const text = match[1]!;
      if (!text.includes("self.__next_f.push")) continue;

      if (!poster) {
        poster = this.extractPosterUrl(text);
      }

      if (!synopsisLocked) {
        const p = this.parseRscPayload(text);
        if (p) {
          const result = this.extractSynopsis(p, html);
          if (result != null) {
            synopsis = result;
            synopsisLocked = true;
          }
        }
      }
    }

    return { poster, synopsis };
  }
}
