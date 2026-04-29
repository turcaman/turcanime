import { Anime } from "../../domain/entities";
import { log } from "../../utils/logger";

interface CardMatch {
  url: string;
  image: string;
  title: string;
}

function cleanTitle(raw: string): string {
  return raw.replace(/^Ver\s+/i, "").replace(/\s+Sub\s+.*$/i, "").trim();
}

function sanitizeTitle(title: string): string {
  return title.replace(/&amp;/g, "&").replace(/<[^>]*>/g, "").trim();
}

function createCard(match: CardMatch): Anime {
  return {
    title: cleanTitle(sanitizeTitle(match.title)),
    image: match.image,
    url: match.url,
    status: "",
  };
}

function extractCardsWithRegex(
  html: string,
  regex: RegExp,
  seen: Set<string>
): Anime[] {
  const cards: Anime[] = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    const url = match[1];
    if (seen.has(url)) continue;
    seen.add(url);

    cards.push(
      createCard({
        url,
        image: match[2],
        title: match[3],
      })
    );
  }

  return cards;
}

function strategyPrimarySrc(html: string, seen: Set<string>): Anime[] {
  const regex =
    /<a[^>]*class="[^"]*animeCard[^"]*"[^>]*href="\/anime\/([^"]+)"[^>]*>.*?<img[^>]*src="([^"]+)"[^>]*>.*?<h2[^>]*>(.*?)<\/h2>.*?<\/a>/gs;
  return extractCardsWithRegex(html, regex, seen);
}

function strategyDataSrc(html: string, seen: Set<string>): Anime[] {
  const regex =
    /<a[^>]*class="[^"]*animeCard[^"]*"[^>]*href="\/anime\/([^"]+)"[^>]*>.*?<img[^>]*data-src="([^"]+)"[^>]*>.*?<h2[^>]*>(.*?)<\/h2>.*?<\/a>/gs;
  return extractCardsWithRegex(html, regex, seen);
}

function strategyNextJsLink(html: string, seen: Set<string>): Anime[] {
  const regex =
    /<Link[^>]*href="\/anime\/([^"]+)"[^>]*>.*?<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>.*?<[^>]*>(.*?)<\/[^>]*>.*?<\/Link>/gs;
  return extractCardsWithRegex(html, regex, seen);
}

function strategyGeneric(html: string, seen: Set<string>): Anime[] {
  const regex =
    /<a[^>]*href="\/anime\/([^"]+)"[^>]*>.*?<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>.*?<(?:h2|h3|span|div|p)[^>]*>(.*?)<\/(?:h2|h3|span|div|p)>.*?<\/a>/gs;
  return extractCardsWithRegex(html, regex, seen);
}

function strategyContextSearch(html: string, seen: Set<string>): Anime[] {
  const linkRegex = /href="\/anime\/([^"]+)"/g;
  const links = [...html.matchAll(linkRegex)].map((m) => m[1]);
  const uniqueLinks = [...new Set(links)];
  const cards: Anime[] = [];

  for (const url of uniqueLinks) {
    if (seen.has(url)) continue;

    const linkIndex = html.indexOf(`href="/anime/${url}"`);
    if (linkIndex === -1) continue;

    const context = html.substring(
      Math.max(0, linkIndex - 500),
      Math.min(html.length, linkIndex + 500)
    );
    const imgMatch = context.match(
      /(?:src|data-src)="([^"]+\.(?:jpg|jpeg|png|webp))"/i
    );

    if (imgMatch) {
      seen.add(url);
      cards.push({
        title: url
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        image: imgMatch[1],
        url: url,
        status: "",
      });
    }
  }

  return cards;
}

export function parseCardsWithStrategies(html: string): {
  cards: Anime[];
  strategyUsed: string;
  success: boolean;
} {
  const seen = new Set<string>();
  let cards: Anime[] = [];
  let strategyUsed = "none";

  log("HtmlParser", `HTML length: ${html.length}, contains animeCard: ${html.includes("animeCard")}`);
  log("HtmlParser", `Contains /anime/ links: ${html.includes("/anime/")}`);

  const strategies = [
    { name: "primary_src", fn: strategyPrimarySrc },
    { name: "fallback_data-src", fn: strategyDataSrc },
    { name: "fallback_nextjs_link", fn: strategyNextJsLink },
    { name: "fallback_generic", fn: strategyGeneric },
    { name: "fallback_context_search", fn: strategyContextSearch },
  ];

  for (const strategy of strategies) {
    if (cards.length > 0) break;
    cards = strategy.fn(html, seen);
    if (cards.length > 0) {
      strategyUsed = strategy.name;
    }
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
