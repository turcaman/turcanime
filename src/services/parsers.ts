import type { Anime, AnimeRelations, Episode } from "../types";
import { TMDB_IMAGE_BASE } from "../config/source";
import { logger } from "../utils/logger";

export class ParserUtils {
  static sanitizeTitle(title: string): string {
    return title
      .replace(/&amp;/g, "&")
      .replace(/<[^>]*>/g, "")
      .trim();
  }

  static extractJson(text: string, key: string, sChar: string, eChar: string): string {
    const idx = text.indexOf(key);
    if (idx === -1) return "";
    const start = text.indexOf(sChar, idx + key.length);
    if (start === -1) return "";
    let depth = 1;
    let end = start + 1;
    while (depth > 0 && end < text.length) {
      if (text[end] === sChar) depth++;
      else if (text[end] === eChar) depth--;
      end++;
    }
    return text.slice(start, end);
  }

  static cleanUrl(url: string): string {
    return url.replace(/^\/+/, "").replace(/\/+$/, "");
  }
}

const CARD_LINK_REGEX = /<a[^>]*class="group block"[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*(?:src|data-src)="([^"]*)"[\s\S]*?alt="([^"]*)"/g;

function createAnimeCard(url: string, image: string, title: string): Anime {
  return {
    title: cleanTitle(ParserUtils.sanitizeTitle(title)),
    image,
    url: ParserUtils.cleanUrl(url),
    status: "",
  };
}

function cleanTitle(raw: string): string {
  return raw.replace(/^Ver\s+/i, "").replace(/\s+Sub\s+.*$/i, "").trim();
}

export class HtmlParser {
  parseCards(html: string): Anime[] {
    const seen = new Set<string>();
    const cards: Anime[] = [];
    let match: RegExpExecArray | null;
    while ((match = CARD_LINK_REGEX.exec(html)) !== null) {
      const url = match[1]!;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      cards.push(createAnimeCard(url, match[2]!, match[3]!));
    }
    return cards;
  }

  parseEpisodes(html: string, slug: string): Episode[] {
    const parse = (json: string): Episode[] => {
      try {
        const episodes = JSON.parse(json);
        if (!Array.isArray(episodes)) return [];
        return episodes
          .filter((ep: { id: unknown; number: unknown }) => ep.id != null && ep.number != null)
          .map((ep: { id: unknown; number: unknown }) => ({
            id: String(ep.id),
            number: String(ep.number),
            url: `/ver/${slug}/${ep.number}`,
          }));
      } catch {
        return [];
      }
    };

    const rawJsonMatch = ParserUtils.extractJson(html, '"episodes":', "[", "]");
    if (rawJsonMatch) {
      logger.info("HtmlParser", `Extracted episodes via raw HTML for ${slug}`);
      return parse(rawJsonMatch);
    }

    const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
    for (const match of scripts) {
      const text = match[1]!.replace(/\\"/g, '"');
      const scriptJsonMatch = ParserUtils.extractJson(text, '"episodes":', "[", "]");
      if (scriptJsonMatch) {
        logger.info("HtmlParser", `Extracted episodes via script JSON for ${slug}`);
        return parse(scriptJsonMatch);
      }
    }

    logger.info("HtmlParser", `Falling back to HTML parsing for ${slug}`);
    return this.parseEpisodesFromHtml(html, slug);
  }

  parseEpisodesFromHtml(html: string, slug: string): Episode[] {
    const episodeRegex = /<a[^>]*href="\/ver\/([^/]+)\/(\d+)"[^>]*>/g;
    const episodes: Episode[] = [];
    const seen = new Set<string>();
    let match;

    while ((match = episodeRegex.exec(html)) !== null) {
      const episodeSlug = match[1];
      const number = match[2]!;
      if (episodeSlug !== slug) continue;
      const key = `${slug}-${number}`;
      if (seen.has(key)) continue;
      seen.add(key);
      episodes.push({ id: number, number, url: `/ver/${slug}/${number}` });
    }

    if (episodes.length === 0) {
      logger.info("HtmlParser", `No episodes extracted for ${slug} from HTML`);
    }
    return episodes;
  }

  extractMetaTags(html: string): { title: string | null; banner: string | null; description: string | null } {
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const bannerMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    const descriptionMatch = html.match(/<meta name="description" content="([^"]+)"/);
    return {
      title: titleMatch?.[1] ?? null,
      banner: bannerMatch?.[1] ?? null,
      description: descriptionMatch?.[1] ?? null,
    };
  }

  extractTitleFromHtml(html: string): string {
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    return h1Match?.[1]?.trim() ?? "";
  }

  extractStatusFromHtml(html: string): string {
    const statusRegex = /<span[^>]*class="[^"]*\b(?:text-primary|text-muted-foreground)\b[^"]*"[^>]*>([^<]+)<\/span>/gi;
    const statusMatch = html.match(statusRegex);
    if (statusMatch) {
      for (const match of statusMatch) {
        const textMatch = match.match(/>([^<]+)<\//);
        if (textMatch) {
          const text = textMatch[1]!.trim();
          if (/^en\s*emisi[oó]n$/i.test(text)) return "En emisión";
          if (/^finalizado$/i.test(text)) return "Finalizado";
        }
      }
    }
    return "";
  }

  extractSynopsisFromDom(html: string): string | null {
    const domOverview = html.match(/page_overview__[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (domOverview) {
      const cleaned = domOverview[1]!.replace(/<[^>]*>/g, "").trim();
      if (cleaned.length > 20) return cleaned;
    }
    return null;
  }

  extractSynopsisFromJsonLd(html: string): string | null {
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!jsonLdMatch) return null;
    try {
      const data = JSON.parse(jsonLdMatch[1]!);
      return data.description ?? null;
    } catch {
      return null;
    }
  }

  extractImageFromJsonLd(html: string): string | null {
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!jsonLdMatch) return null;
    try {
      const data = JSON.parse(jsonLdMatch[1]!);
      if (data.image != null) {
        if (typeof data.image === "string") return data.image;
        if (Array.isArray(data.image) && data.image.length > 0) return data.image[0];
      }
      return null;
    } catch {
      return null;
    }
  }

  extractGenresFromJsonLd(html: string): string[] {
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!jsonLdMatch) return [];
    try {
      const data = JSON.parse(jsonLdMatch[1]!);
      return Array.isArray(data.genre) ? data.genre.map(String) : [];
    } catch {
      return [];
    }
  }

  extractSynopsisFromRsc(rsc: string, fullHtml: string): string | null {
    const ovMatch = rsc.match(
      /page_overview__[^"]*"\s*,\s*"children"\s*:\s*"((?:\\.|[^"\\])*)"/
    );
    if (ovMatch) {
      const val = ovMatch[1]!;
      if (val.startsWith("$")) {
        const rid = val.slice(1);
        const resolved = this.resolveRscReference(fullHtml, rid);
        if (resolved != null && resolved.length > 20) return resolved;
      } else {
        try {
          const parsed = JSON.parse('"' + val + '"');
          if (typeof parsed === "string" && parsed.length > 20) return parsed;
        } catch {
          if (val.length > 20) return val;
        }
      }
    }

    const tMatch = rsc.match(/^\d+:T(?:\w+,)?([\s\S]+)$/);
    if (tMatch) {
      const candidate = tMatch[1]!;
      if (candidate.length > 30 && !candidate.startsWith("Ver ")) {
        return candidate;
      }
    }
    return null;
  }

  extractPosterFromRsc(rsc: string): string {
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

  parseRscPayload(text: string): string {
    const s = text.indexOf("([");
    const e = text.lastIndexOf("])");
    if (s === -1 || e === -1 || e <= s) return "";
    try {
      const slice = text.slice(s + 1, e + 1);
      const a = JSON.parse(slice);
      if (!Array.isArray(a) || typeof a[1] !== "string") {
        logger.info("RscParser", "Unexpected RSC array format");
        return "";
      }
      return a[1];
    } catch {
      logger.warn("RscParser", "JSON parse failed");
      return "";
    }
  }

  parseAllFromScripts(html: string): { poster: string; synopsis: string | null; relations: AnimeRelations | null } {
    let poster = "";
    let synopsis: string | null = null;
    let relations: AnimeRelations | null = null;
    let synopsisLocked = false;
    let relationsLocked = false;

    const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
    for (const match of scripts) {
      const text = match[1]!;
      if (!text.includes("self.__next_f.push")) continue;

      if (!poster) poster = this.extractPosterFromRsc(text);

      const p = this.parseRscPayload(text);
      if (!synopsisLocked && p) {
        const result = this.extractSynopsisFromRsc(p, html);
        if (result != null) { synopsis = result; synopsisLocked = true; }
      }
      if (!relationsLocked && p) {
        const result = this.extractRelations(p);
        if (result != null) { relations = result; relationsLocked = true; }
      }
    }
    return { poster, synopsis, relations };
  }

  private resolveRscReference(html: string, refId: string): string | null {
    try {
      const hexPattern = new RegExp('"' + refId + ':T\\w+,((?:[^"\\\\]|\\\\.)*)"(?:,|$)', "");
      const hexMatch = html.match(hexPattern);
      if (hexMatch) return this.unescapeRscValue(hexMatch[1]!);

      const refPattern = new RegExp('"' + refId + '":\\s*T\\d+,"((?:[^"\\\\]|\\\\.)*)"', "");
      const refMatch = html.match(refPattern);
      if (refMatch) return this.unescapeRscValue(refMatch[1]!);
    } catch {
    }
    return null;
  }

  private unescapeRscValue(raw: string): string {
    return raw.replace(/\\\\/g, "\\").replace(/\\"/g, '"').replace(/\\n/g, "\n");
  }

  extractRelations(rsc: string): AnimeRelations | null {
    const key = '"relations":{"prequel":';
    const idx = rsc.indexOf(key);
    if (idx === -1) return null;

    const start = rsc.indexOf("{", idx);
    if (start === -1) return null;

    let depth = 1;
    let end = start + 1;
    while (depth > 0 && end < rsc.length) {
      if (rsc[end] === "{") depth++;
      else if (rsc[end] === "}") depth--;
      end++;
    }

    const raw = rsc.slice(start, end);
    try {
      const parsed = JSON.parse(raw) as AnimeRelations;
      const normalize = (item: { poster: string }) => {
        if (item.poster && !item.poster.startsWith("http")) {
          item.poster = `${TMDB_IMAGE_BASE}${item.poster}`;
        }
      };
      parsed.prequel.forEach(normalize);
      parsed.sequel.forEach(normalize);
      parsed.related.forEach(normalize);
      return parsed;
    } catch {
      return null;
    }
  }
}
