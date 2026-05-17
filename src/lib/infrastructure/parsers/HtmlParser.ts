import { Anime, Episode } from "../../domain/entities";
import { IHtmlParser, ParseResult } from "../../domain/interfaces";
import { log } from "../../utils/logger";
import { cleanTitle } from "../../utils/text";
import { ParserUtils } from "./ParserUtils";

interface CardStrategy {
  name: string;
  regex: RegExp;
  extractCard: (match: RegExpMatchArray) => Anime | null;
}

// Constants for context search
const CONTEXT_SEARCH_RADIUS = 500;
const MIN_TITLE_LENGTH = 20;

// Card extraction strategies ordered by priority
const CARD_STRATEGIES: CardStrategy[] = [
  {
    name: "recent_animes",
    regex: /<a[^>]*class="group block"[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*(?:src|data-src)="([^"]+)"[\s\S]*?alt="([^"]+)"/g,
    extractCard: (match) => null,
  },
  {
    name: "primary_src",
    regex: /<a[^>]*class="[^"]*animeCard[^"]*"[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>[\s\S]*?<\/a\s*>/g,
    extractCard: (match) => null,
  },
  {
    name: "fallback_data-src",
    regex: /<a[^>]*class="[^"]*animeCard[^"]*"[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*data-src="([^"]+)"[\s\S]*?>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>[\s\S]*?<\/a\s*>/g,
    extractCard: (match) => null,
  },
  {
    name: "fallback_nextjs_link",
    regex: /<Link[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*(?:src|data-src)="([^"]+)"[\s\S]*?>[\s\S]*?<[^>]*>([\s\S]*?)<\/[^>]*>[\s\S]*?<\/Link\s*>/g,
    extractCard: (match) => null,
  },
  {
    name: "fallback_generic",
    regex: /<a[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*(?:src|data-src)="([^"]+)"[\s\S]*?>[\s\S]*?<(?:h2|h3|span|div|p)[^>]*>([\s\S]*?)<\/(?:h2|h3|span|div|p)>[\s\S]*?<\/a\s*>/g,
    extractCard: (match) => null,
  },
];

export class HtmlParser implements IHtmlParser {
  constructor() {
    // Initialize strategy extractCard functions with bound method
    CARD_STRATEGIES.forEach(strategy => {
      strategy.extractCard = (match: RegExpMatchArray) =>
        this.createAnimeCard(match[1], match[2], match[3]);
    });
  }

  private createAnimeCard(url: string, image: string, title: string): Anime {
    return {
      title: cleanTitle(ParserUtils.sanitizeTitle(title)),
      image,
      url: ParserUtils.cleanUrl(url),
      status: "",
    };
  }

  private extractCardsWithStrategy(html: string, strategy: CardStrategy, seen: Set<string>): Anime[] {
    const results = ParserUtils.extractWithRegex(html, strategy.regex, (match) => {
      const url = match[1];
      if (!ParserUtils.isValidUrl(url) || seen.has(url)) return null;

      seen.add(url);
      return strategy.extractCard(match);
    });

    return results
      .filter((card): card is Anime => card !== null);
  }

  private strategyContextSearch(html: string, seen: Set<string>): Anime[] {
    const linkRegex = /href="\/anime\/([^"]+)"/g;
    const links = [...html.matchAll(linkRegex)].map((m) => m[1]);
    const uniqueLinks = [...new Set(links)];

    return uniqueLinks
      .filter(url => !seen.has(url))
      .map(url => {
        const linkIndex = html.indexOf(`href="/anime/${url}"`);
        if (linkIndex === -1) return null;

        const context = this.extractContextAroundLink(html, linkIndex);
        const imageUrl = ParserUtils.extractImageUrl(context);
        const altTitle = this.extractTitleFromAltAttribute(context);

        if (imageUrl) {
          seen.add(url);
          const title = altTitle || this.formatTitleFromUrl(url);
          return this.createAnimeCard(url, imageUrl, title);
        }
        return null;
      })
      .filter((card): card is Anime => card !== null);
  }

  private extractContextAroundLink(html: string, linkIndex: number): string {
    return html.substring(
      Math.max(0, linkIndex - CONTEXT_SEARCH_RADIUS),
      Math.min(html.length, linkIndex + CONTEXT_SEARCH_RADIUS)
    );
  }

  private formatTitleFromUrl(url: string): string {
    return url
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  private extractTitleFromAltAttribute(context: string): string | null {
    const altMatch = context.match(/alt="([^"]+)"/);
    return altMatch ? altMatch[1].trim() : null;
  }

  parseCards(html: string): ParseResult {
    const seen = new Set<string>();
    let strategyUsed = "none";

    this.logParsingInfo(html);

    let cards: Anime[] = [];

    const strategyResult = this.tryStrategies(html, seen);
    if (strategyResult) {
      cards = strategyResult.cards;
      strategyUsed = strategyResult.strategyName;
    } else {
      cards = this.strategyContextSearch(html, seen);
      if (cards.length > 0) {
        strategyUsed = "fallback_context_search";
      }
    }

    this.logResults(strategyUsed, cards.length);

    return {
      cards,
      strategyUsed,
      success: cards.length > 0,
    };
  }

  private logParsingInfo(html: string): void {
    log("HtmlParser", `HTML length: ${html.length}, contains "group block": ${html.includes("group block")}, contains animeCard: ${html.includes("animeCard")}`);
    log("HtmlParser", `Contains /anime/ links: ${html.includes("/anime/")}`);
  }

  private tryStrategies(html: string, seen: Set<string>): { cards: Anime[]; strategyName: string } | null {
    for (const strategy of CARD_STRATEGIES) {
      const cards = this.extractCardsWithStrategy(html, strategy, seen);
      if (cards.length > 0) {
        return { cards, strategyName: strategy.name };
      }
    }
    return null;
  }

  private logResults(strategyUsed: string, cardCount: number): void {
    log("HtmlParser", `Strategy used: ${strategyUsed}, found ${cardCount} cards`);

    if (cardCount === 0) {
      log("HtmlParser", "WARNING: All strategies failed, site structure may have changed");
    }
  }

  parseEpisodes(html: string, slug: string): Episode[] {
    const parse = (json: string): Episode[] => {
      try {
        const episodes = JSON.parse(json);
        if (!Array.isArray(episodes)) return [];
        return episodes
          .filter((ep: any) => ep && ep.id != null && ep.number != null)
          .map((ep: any) => ({
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
      if (cleaned.length > MIN_TITLE_LENGTH) return cleaned;
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
