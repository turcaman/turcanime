import { Anime } from "../../domain/entities";
import { log } from "../../utils/logger";

export interface ParseResult {
  cards: Anime[];
  strategyUsed: string;
  success: boolean;
}

export class HtmlParser {
  private cleanTitle(raw: string): string {
    return raw.replace(/^Ver\s+/i, "").replace(/\s+Sub\s+.*$/i, "").trim();
  }

  parseCards(html: string): ParseResult {
    const seen = new Set<string>();
    let strategyUsed = "none";

    log("HtmlParser", `HTML length: ${html.length}, contains animeCard: ${html.includes("animeCard")}`);
    log("HtmlParser", `Contains /anime/ links: ${html.includes("/anime/")}`);

    // Strategy 1: Primary - animeCard class with src attribute
    const cardRegex =
      /<a[^>]*class="[^"]*animeCard[^"]*"[^>]*href="\/anime\/([^"]+)"[^>]*>.*?<img[^>]*src="([^"]+)"[^>]*>.*?<h2[^>]*>(.*?)<\/h2>.*?<\/a>/gs;
    let match;
    let cards: Anime[] = [];
    while ((match = cardRegex.exec(html)) !== null) {
      const url = match[1];
      if (seen.has(url)) continue;
      seen.add(url);
      cards = [...cards, {
        title: this.cleanTitle(match[3].replace(/&amp;/g, "&").replace(/<[^>]*>/g, "").trim()),
        image: match[2],
        url: url,
        status: "",
      }];
    }
    if (cards.length > 0) strategyUsed = "primary_src";

    // Strategy 2: animeCard class with data-src attribute (lazy loading)
    if (cards.length === 0) {
      const dataSrcRegex =
        /<a[^>]*class="[^"]*animeCard[^"]*"[^>]*href="\/anime\/([^"]+)"[^>]*>.*?<img[^>]*data-src="([^"]+)"[^>]*>.*?<h2[^>]*>(.*?)<\/h2>.*?<\/a>/gs;
      while ((match = dataSrcRegex.exec(html)) !== null) {
        const url = match[1];
        if (seen.has(url)) continue;
        seen.add(url);
        cards = [...cards, {
          title: this.cleanTitle(match[3].replace(/&amp;/g, "&").replace(/<[^>]*>/g, "").trim()),
          image: match[2],
          url: url,
          status: "",
        }];
      }
      if (cards.length > 0) strategyUsed = "fallback_data-src";
    }

    // Strategy 3: Next.js Link component with image
    if (cards.length === 0) {
      const nextLinkRegex =
        /<Link[^>]*href="\/anime\/([^"]+)"[^>]*>.*?<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>.*?<[^>]*>(.*?)<\/[^>]*>.*?<\/Link>/gs;
      while ((match = nextLinkRegex.exec(html)) !== null) {
        const url = match[1];
        if (seen.has(url)) continue;
        seen.add(url);
        cards = [...cards, {
          title: this.cleanTitle(match[3].replace(/&amp;/g, "&").replace(/<[^>]*>/g, "").trim()),
          image: match[2],
          url: url,
          status: "",
        }];
      }
      if (cards.length > 0) strategyUsed = "fallback_nextjs_link";
    }

    // Strategy 4: Generic - any link to /anime/ with image and title
    if (cards.length === 0) {
      const genericRegex =
        /<a[^>]*href="\/anime\/([^"]+)"[^>]*>.*?<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>.*?<(?:h2|h3|span|div|p)[^>]*>(.*?)<\/(?:h2|h3|span|div|p)>.*?<\/a>/gs;
      while ((match = genericRegex.exec(html)) !== null) {
        const url = match[1];
        if (seen.has(url)) continue;
        seen.add(url);
        cards = [...cards, {
          title: this.cleanTitle(match[3].replace(/&amp;/g, "&").replace(/<[^>]*>/g, "").trim()),
          image: match[2],
          url: url,
          status: "",
        }];
      }
      if (cards.length > 0) strategyUsed = "fallback_generic";
    }

    // Strategy 5: Last resort - extract all /anime/ links and try to find images nearby
    if (cards.length === 0) {
      const linkRegex = /href="\/anime\/([^"]+)"/g;
      const links = [...html.matchAll(linkRegex)].map((m) => m[1]);
      const uniqueLinks = [...new Set(links)];

      for (const url of uniqueLinks) {
        if (seen.has(url)) continue;
        const linkIndex = html.indexOf(`href="/anime/${url}"`);
        if (linkIndex === -1) continue;

        const context = html.substring(
          Math.max(0, linkIndex - 500),
          Math.min(html.length, linkIndex + 500)
        );
        const imgMatch = context.match(/(?:src|data-src)="([^"]+\.(?:jpg|jpeg|png|webp))"/i);

        if (imgMatch) {
          seen.add(url);
          cards = [...cards, {
            title: url.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            image: imgMatch[1],
            url: url,
            status: "",
          }];
        }
      }
      if (cards.length > 0) strategyUsed = "fallback_context_search";
    }

    log("HtmlParser", `Strategy used: ${strategyUsed}, found ${cards.length} cards`);

    if (cards.length === 0) {
      log("HtmlParser", "WARNING: All strategies failed, site structure may have changed");
    }

    return {
      cards,
      strategyUsed,
      success: cards.length > 0,
    };
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
      if (cleaned.length > 20) return cleaned;
    }
    return null;
  }
}
