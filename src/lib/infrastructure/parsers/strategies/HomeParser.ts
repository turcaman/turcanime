import { Anime } from "../../../domain/entities";
import { ParserUtils } from "../ParserUtils";
import { IParserStrategy, ParserResult } from "./types";
import { BaseParser } from "./BaseParser";

interface CardStrategy {
  name: string;
  regex: RegExp;
}

const CONTEXT_SEARCH_RADIUS = 500;

const CARD_STRATEGIES: CardStrategy[] = [
  {
    name: "recent_animes",
    regex: /<a[^>]*class="group block"[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*(?:src|data-src)="([^"]+)"[\s\S]*?alt="([^"]+)"/g,
  },
  {
    name: "primary_src",
    regex: /<a[^>]*class="[^"]*animeCard[^"]*"[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>[\s\S]*?<\/a\s*>/g,
  },
  {
    name: "fallback_data-src",
    regex: /<a[^>]*class="[^"]*animeCard[^"]*"[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*data-src="([^"]+)"[\s\S]*?>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>[\s\S]*?<\/a\s*>/g,
  },
  {
    name: "fallback_nextjs_link",
    regex: /<Link[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*(?:src|data-src)="([^"]+)"[\s\S]*?>[\s\S]*?<[^>]*>([\s\S]*?)<\/[^>]*>[\s\S]*?<\/Link\s*>/g,
  },
  {
    name: "fallback_generic",
    regex: /<a[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*(?:src|data-src)="([^"]+)"[\s\S]*?>[\s\S]*?<(?:h2|h3|span|div|p)[^>]*>([\s\S]*?)<\/(?:h2|h3|span|div|p)>[\s\S]*?<\/a\s*>/g,
  },
];

export class HomeParser extends BaseParser implements IParserStrategy<Anime[]> {
  parse(html: string): ParserResult<Anime[]> {
    const seen = new Set<string>();
    
    // Try strategies
    for (const strategy of CARD_STRATEGIES) {
      const cards = this.extractCardsWithStrategy(html, strategy, seen);
      if (cards.length > 0) return { data: cards, strategyUsed: strategy.name, success: true };
    }

    // Fallback
    const cards = this.strategyContextSearch(html, seen);
    if (cards.length > 0) return { data: cards, strategyUsed: "fallback_context_search", success: true };

    return { data: [], strategyUsed: "none", success: false };
  }

  private extractCardsWithStrategy(html: string, strategy: CardStrategy, seen: Set<string>): Anime[] {
    return ParserUtils.extractWithRegex(html, strategy.regex, (match) => {
      const url = match[1];
      if (!ParserUtils.isValidUrl(url) || seen.has(url)) return null;
      seen.add(url);
      return this.createAnimeCard(url, match[2], match[3]);
    }).filter((card): card is Anime => card !== null);
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

        const context = this.extractContextAroundLink(html, linkIndex, CONTEXT_SEARCH_RADIUS);
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
}
