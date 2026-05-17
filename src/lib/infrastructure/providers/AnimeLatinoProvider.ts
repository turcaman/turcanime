import { registerProvider } from "../../core/providerFactory";
import { AbstractProvider } from "../../domain/abstractProvider";
import {
    Anime,
    AnimeDetail,
    AutocompleteAnime,
    HomeData,
    VideoServer
} from "../../domain/entities";
import { IContentProvider, ISessionManager } from "../../domain/interfaces";
import { CacheRepo } from "../../domain/repositories/cacheRepo";
import { log } from "../../utils/logger";
import { cleanTitle } from "../../utils/text";
import { MetricsTracker } from "../metrics/MetricsTracker";
import { HtmlParser } from "../parsers/HtmlParser";
import { RscParser } from "../parsers/RscParser";
import { SiteVersionManager } from "../version/SiteVersionManager";

interface RawServerItem {
  id: string | number;
  server: { title: string };
  videoUrlEncrypted: string;
  languaje: string;
}

/**
 * AnimeLatinoProvider - Content provider for AnimeLatinoHD
 *
 * Responsibilities:
 * - HTTP fetching (inherited from AbstractProvider)
 * - Orchestration of HTML/RSC parsing (delegated to parsers)
 * - Site version tracking (delegated to SiteVersionManager)
 * - Metrics tracking (delegated to MetricsTracker)
 */
export class AnimeLatinoProvider extends AbstractProvider implements IContentProvider {
  readonly name = "AnimeLatinoHD";

  private htmlParser: HtmlParser;
  private rscParser: RscParser;
  private versionManager: SiteVersionManager;
  private metrics: MetricsTracker;

  constructor(
    sessionManager: ISessionManager,
    cacheRepo: CacheRepo,
    baseUrl: string = "https://www.animelatinohd.com"
  ) {
    super(sessionManager, baseUrl);
    this.htmlParser = new HtmlParser();
    this.rscParser = new RscParser();
    this.versionManager = new SiteVersionManager(sessionManager, cacheRepo);
    this.metrics = new MetricsTracker(cacheRepo);
  }

  // ——— Public API ———

  async getHomeData(options?: { signal?: AbortSignal }): Promise<HomeData> {
    const res = await this.fetchWithSession("/", options || {});
    const html = await res.text();

    // Check for site structure changes
    await this.versionManager.checkAndInvalidateIfNeeded(html);

    const recent = this.parseCardsWithMetrics(html);

    if (recent.length === 0) {
      log("getHomeData", "No cards extracted — site structure may have changed");
    }

    return { recent };
  }

  async search(query: string, options?: { signal?: AbortSignal }): Promise<Anime[]> {
    const res = await this.fetchWithSession(
      `/animes?search=${encodeURIComponent(query)}`,
      options || {}
    );
    const html = await res.text();
    const cards = this.parseCardsWithMetrics(html);

    if (cards.length === 0) {
      log("search", `No cards extracted for query: ${query}`);
    }
    return cards;
  }

  async getSuggestions(query: string, options?: { signal?: AbortSignal }): Promise<AutocompleteAnime[]> {
    try {
      const res = await this.fetchWithSession(
        `/api/search?query=${encodeURIComponent(query)}`,
        options || {}
      );
      return await res.json();
    } catch (e: unknown) {
      log("getSuggestions", `Failed for: ${query}`, e);
      return [];
    }
  }

  async getDetails(slug: string, options?: { signal?: AbortSignal }): Promise<AnimeDetail | null> {
    const res = await this.fetchWithSession(`/anime/${slug}`, options || {});
    const html = await res.text();

    const meta = this.htmlParser.extractMetaTags(html);
    const rscData = this.rscParser.parseAllFromScripts(html);

    const title = this.htmlParser.extractTitleFromHtml(html);
    const status = this.htmlParser.extractStatusFromHtml(html);
    const episodes = this.htmlParser.parseEpisodesFromHtml(html, slug);

    const domSynopsis = this.htmlParser.extractSynopsisFromDom(html);
    const synopsis = rscData.synopsis || domSynopsis || meta.description || "";

    const result: AnimeDetail = {
      title: cleanTitle(title || meta.title || ""),
      image: rscData.poster,
      synopsis,
      banner: meta.banner || rscData.poster,
      poster: rscData.poster,
      status,
      genres: [],
      episodes,
      url: slug,
    };

    if (!result.title && episodes.length === 0) {
      log("getDetails", `Failed to parse details for: ${slug}`);
    }

    return result;
  }

  async getEpisodeServers(slug: string, number: string, options?: { signal?: AbortSignal }): Promise<VideoServer[]> {
    const res = await this.fetchWithSession(`/ver/${slug}/${number}`, options || {});
    const html = await res.text();
    let servers: VideoServer[] = [];

    const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
    for (const match of scripts) {
      const text = match[1];
      if (!text.includes("self.__next_f.push")) continue;

      const p = this.rscParser.parseRscPayload(text);
      if (!p || !p.includes('"data":[[')) continue;

      const j = this.rscParser.extractJson(p, '"data":', "[", "]");
      if (!j) continue;

      try {
        const data = JSON.parse(j);
        const newServers: VideoServer[] = [];
        data.forEach((r: RawServerItem[]) =>
          r.forEach((i: RawServerItem) => {
            if (!i?.server || i.server.title === "Gamma") return;
            if (!i.videoUrlEncrypted) {
              log(
                "getEpisodeServers",
                `Missing videoUrlEncrypted for server: ${i.server.title}`
              );
              return;
            }
            let l = "SUB";
            if (i.languaje === "1") l = "LATINO";
            if (i.languaje === "2") l = "CASTELLANO";
            newServers.push({
              id: i.id.toString(),
              title: i.server.title,
              url: i.videoUrlEncrypted.replace(/\\/g, "/"),
              language: l,
            });
          })
        );
        servers = [...servers, ...newServers];
      } catch (e: unknown) {
        log("getEpisodeServers", `JSON parse failed for ${slug} ep ${number}`, e);
      }
    }

    if (servers.length === 0) {
      log("getEpisodeServers", `No servers extracted for ${slug} ep ${number}`);
    }

    return servers;
  }

  // ——— Helpers ———

  private parseCardsWithMetrics(html: string): Anime[] {
    const result = this.htmlParser.parseCards(html);
    if (result.strategyUsed !== "none") {
      this.metrics.record(result.strategyUsed, result.success);
    }
    return result.cards;
  }

}

// Self-register as the "safe" mode provider
registerProvider("safe", AnimeLatinoProvider);
