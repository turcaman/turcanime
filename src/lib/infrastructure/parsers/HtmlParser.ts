import type { Anime, Episode } from "../../domain/entities";
import type { IHtmlParser } from "../../domain/interfaces";
import { logger } from "../../utils/logger";
import { ParserUtils } from "./ParserUtils";
import { cleanTitle } from "../../utils/text";

const CARD_LINK_REGEX = /<a[^>]*class="group block"[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*(?:src|data-src)="([^"]+)"[\s\S]*?alt="([^"]+)"/g;

function createAnimeCard(url: string, image: string, title: string): Anime {
  return {
    title: cleanTitle(ParserUtils.sanitizeTitle(title)),
    image,
    url: ParserUtils.cleanUrl(url),
    status: "",
  };
}

export class HtmlParser implements IHtmlParser {
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

  extractMetaTags(html: string): {
    title: string | null;
    banner: string | null;
    description: string | null;
  } {
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const bannerMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    const descriptionMatch = html.match(/<meta name="description" content="([^"]+)"/);

    return {
      title: titleMatch?.[1] ?? null,
      banner: bannerMatch?.[1] ?? null,
      description: descriptionMatch?.[1] ?? null,
    };
  }

  extractSynopsisFromDom(html: string): string | null {
    const domOverview = html.match(/page_overview__[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (domOverview) {
      const cleaned = domOverview[1]!.replace(/<[^>]*>/g, "").trim();
      if (cleaned.length > 20) return cleaned;
    }
    return null;
  }

  extractTitleFromHtml(html: string): string {
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    if (h1Match) {
      return h1Match[1]!.trim();
    }
    return "";
  }

  extractStatusFromHtml(html: string): string {
    // Look for a span with text-primary or text-muted-foreground class
    // that contains status text ("En emision" / "Finalizado")
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

      episodes.push({
        id: number,
        number,
        url: `/ver/${slug}/${number}`,
      });
    }

    if (episodes.length === 0) {
      logger.info("HtmlParser", `No episodes extracted for ${slug} from HTML`);
    }

    return episodes;
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
      if (Array.isArray(data.genre)) {
        return data.genre.map(String);
      }
      return [];
    } catch {
      return [];
    }
  }
}
