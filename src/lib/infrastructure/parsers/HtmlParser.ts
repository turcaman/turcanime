import { Anime } from "../../domain/entities";
import { log } from "../../utils/logger";
import { cleanTitle } from "../../utils/text";
import { ParserUtils } from "./ParserUtils";

export interface ParseResult {
  cards: Anime[];
  strategyUsed: string;
  success: boolean;
}

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
    name: "primary_src",
    regex: /<a[^>]*class="[^"]*animeCard[^"]*"[^>]*href="\/anime\/([^"]+)"[^>]*>.*?<img[^>]*src="([^"]+)"[^>]*>.*?<h2[^>]*>(.*?)<\/h2>.*?<\/a>/gs,
    extractCard: (match) => null, // Will be set in constructor
  },
  {
    name: "fallback_data-src",
    regex: /<a[^>]*class="[^"]*animeCard[^"]*"[^>]*href="\/anime\/([^"]+)"[^>]*>.*?<img[^>]*data-src="([^"]+)"[^>]*>.*?<h2[^>]*>(.*?)<\/h2>.*?<\/a>/gs,
    extractCard: (match) => null, // Will be set in constructor
  },
  {
    name: "fallback_nextjs_link",
    regex: /<Link[^>]*href="\/anime\/([^"]+)"[^>]*>.*?<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>.*?<[^>]*>(.*?)<\/[^>]*>.*?<\/Link>/gs,
    extractCard: (match) => null, // Will be set in constructor
  },
  {
    name: "fallback_generic",
    regex: /<a[^>]*href="\/anime\/([^"]+)"[^>]*>.*?<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>.*?<(?:h2|h3|span|div|p)[^>]*>(.*?)<\/(?:h2|h3|span|div|p)>.*?<\/a>/gs,
    extractCard: (match) => null, // Will be set in constructor
  },
];

export class HtmlParser {
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

        if (imageUrl) {
          seen.add(url);
          const title = this.formatTitleFromUrl(url);
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
    log("HtmlParser", `HTML length: ${html.length}, contains animeCard: ${html.includes("animeCard")}`);
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

  parseEpisodes(html: string, slug: string): { id: string; number: string; url: string }[] {
    const epMatch = html.match(
      /(?:"|\\")episodes(?:"|\\")\s*:\s*(\[.*?\])\s*,\s*(?:"|\\")animeName(?:"|\\")/
    );
    if (!epMatch) return [];

    interface RawEpisode {
      id: string | number;
      number: string | number;
    }

    try {
      const raw = epMatch[1].replace(/\\"/g, '"');
      const episodes = JSON.parse(raw);
      if (!Array.isArray(episodes)) return [];

      return episodes
        .filter((ep: RawEpisode) => ep && ep.id != null && ep.number != null)
        .map((ep: RawEpisode) => ({
          id: String(ep.id),
          number: String(ep.number),
          url: `/ver/${slug}/${ep.number}`,
        }));
    } catch (e: unknown) {
      log("HtmlParser", "JSON parse failed for episodes", e);
      return [];
    }
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
}
