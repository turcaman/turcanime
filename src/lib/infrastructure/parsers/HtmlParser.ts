import type { Episode } from "../../domain/entities";
import type { IHtmlParser, ParseResult } from "../../domain/interfaces";
import { log } from "../../utils/logger";
import { ParserUtils } from "./ParserUtils";
import { HomeParser } from "./strategies/HomeParser";

export class HtmlParser implements IHtmlParser {
  private homeParser: HomeParser;

  constructor() {
    this.homeParser = new HomeParser();
  }

  parseCards(html: string): ParseResult {
    const result = this.homeParser.parse(html);
    return {
      cards: result.data,
      strategyUsed: result.strategyUsed,
      success: result.success,
    };
  }

  parseEpisodes(html: string, slug: string): Episode[] {
    const parse = (json: string): Episode[] => {
      try {
        const episodes = JSON.parse(json);
        if (!Array.isArray(episodes)) return [];
        return episodes
          .filter((ep: { id: unknown; number: unknown }) => ep && ep.id != null && ep.number != null)
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
      log("HtmlParser", `Extracted episodes via raw HTML for ${slug}`);
      return parse(rawJsonMatch);
    }

    const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
    for (const match of scripts) {
      const text = match[1].replace(/\\"/g, '"');
      const scriptJsonMatch = ParserUtils.extractJson(text, '"episodes":', "[", "]");
      if (scriptJsonMatch) {
        log("HtmlParser", `Extracted episodes via script JSON for ${slug}`);
        return parse(scriptJsonMatch);
      }
    }

    log("HtmlParser", `Falling back to HTML parsing for ${slug}`);
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
      title: titleMatch?.[1] || null,
      banner: bannerMatch?.[1] || null,
      description: descriptionMatch?.[1] || null,
    };
  }

  extractSynopsisFromDom(html: string): string | null {
    const domOverview = html.match(/page_overview__[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (domOverview) {
      const cleaned = domOverview[1].replace(/<[^>]*>/g, "").trim();
      if (cleaned.length > 20) return cleaned;
    }
    return null;
  }

  extractTitleFromHtml(html: string): string {
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    if (h1Match) {
      return h1Match[1].trim();
    }
    return "";
  }

  extractStatusFromHtml(html: string): string {
    const statusMatch = html.match(/<span[^>]*class="[^"]*text-primary[^"]*"[^>]*>([^<]+)<\/span>/);
    if (statusMatch) {
      return statusMatch[1].trim();
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
      const number = match[2];

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
      log("HtmlParser", `No episodes extracted for ${slug} from HTML`);
    }

    return episodes;
  }

  extractSynopsisFromJsonLd(html: string): string | null {
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!jsonLdMatch) return null;
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      return data.description || null;
    } catch {
      return null;
    }
  }

  extractImageFromJsonLd(html: string): string | null {
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!jsonLdMatch) return null;
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      if (data.image) {
        if (typeof data.image === "string") return data.image;
        if (Array.isArray(data.image) && data.image.length > 0) return data.image[0];
      }
      return null;
    } catch {
      return null;
    }
  }
}
