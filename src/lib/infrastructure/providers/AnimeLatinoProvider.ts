import { AbstractProvider } from "../../domain/abstractProvider";
import {
    Anime,
    AnimeDetail,
    AutocompleteAnime,
    HomeData,
    VideoServer
} from "../../domain/entities";
import { IContentProvider, IHtmlParser, IMetricsTracker, IRscParser, ISessionManager, ISiteVersionManager } from "../../domain/interfaces";
import { CacheRepo } from "../../domain/repositories/cacheRepo";
import { log } from "../../utils/logger";
import { cleanTitle } from "../../utils/text";
import { TMDB_IMAGE_BASE } from "../../config/images";

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

  private htmlParser: IHtmlParser;
  private rscParser: IRscParser;
  private versionManager: ISiteVersionManager;
  private metrics: IMetricsTracker;

  constructor(
    sessionManager: ISessionManager,
    cacheRepo: CacheRepo,
    baseUrl: string,
    htmlParser: IHtmlParser,
    rscParser: IRscParser,
    versionManager: ISiteVersionManager,
    metrics: IMetricsTracker,
  ) {
    super(sessionManager, baseUrl);
    this.htmlParser = htmlParser;
    this.rscParser = rscParser;
    this.versionManager = versionManager;
    this.metrics = metrics;
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
    try {
      const res = await this.fetchWithSession(
        `/api/anime/search?q=${encodeURIComponent(query)}`,
        options || {}
      );
      const json = await res.json();
      const items = json.data || [];

      if (!Array.isArray(items)) {
        log("search", `Unexpected response format for query: ${query}`);
        return [];
      }

      return items.map((item: { name: string; slug: string; poster: string }) => ({
        title: cleanTitle(item.name),
        image: item.poster ? (item.poster.startsWith("http") ? item.poster : `${TMDB_IMAGE_BASE}${item.poster}`) : "",
        url: item.slug,
        status: "",
      }));
    } catch (e: unknown) {
      log("search", `Failed for query: ${query}`, e);
      return [];
    }
  }

  async getSuggestions(query: string, options?: { signal?: AbortSignal }): Promise<AutocompleteAnime[]> {
    try {
      const res = await this.fetchWithSession(
        `/api/anime/search?q=${encodeURIComponent(query)}`,
        options || {}
      );
      const json = await res.json();
      const items = json.data || [];

      if (!Array.isArray(items)) return [];

      return items.map((item: { name: string; slug: string; poster: string; type: string }) => ({
        name: item.name,
        slug: item.slug,
        type: item.type,
        poster: item.poster,
      }));
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
    const jsonLdSynopsis = this.htmlParser.extractSynopsisFromJsonLd(html);
    const jsonLdImage = this.htmlParser.extractImageFromJsonLd(html);
    const synopsis = rscData.synopsis || jsonLdSynopsis || domSynopsis || meta.description || "";

    const image = rscData.poster || jsonLdImage || meta.banner || "";

    log("getDetails", `poster: ${rscData.poster}, jsonLdImage: ${jsonLdImage}, banner: ${meta.banner}, final: ${image}`);

    const result: AnimeDetail = {
      title: cleanTitle(title || meta.title || ""),
      image,
      synopsis,
      banner: meta.banner || image,
      poster: image,
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

    const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
    for (const match of scripts) {
      const text = match[1];
      if (!text.includes("self.__next_f.push")) continue;

      const p = this.rscParser.parseRscPayload(text);
      if (!p || !p.includes('"players":')) continue;

      const j = this.rscParser.extractJson(p, '"players":', "[", "]");
      if (!j) continue;

      try {
        const players = JSON.parse(j);
        const servers: VideoServer[] = [];

        for (const player of players) {
          if (player.server_name !== "Delta") continue;

          const languageMap: Record<string, string> = {
            SUB: "SUB",
            LAT: "LATINO",
            ESP: "CASTELLANO",
          };

          servers.push({
            id: String(player.id),
            title: player.server_name,
            url: player.bridge_url,
            language: languageMap[player.language] || player.language,
          });
        }

        if (servers.length > 0) return servers;
      } catch (e: unknown) {
        log("getEpisodeServers", `JSON parse failed for ${slug} ep ${number}`, e);
      }
    }

    log("getEpisodeServers", `No Delta servers extracted for ${slug} ep ${number}`);
    return [];
  }

  async resolveStreamUrl(videoUrl: string, options?: { signal?: AbortSignal }): Promise<string | null> {
    try {
      const res = await this.fetchWithSession(videoUrl, options || {});
      if (!res.ok) {
        log("resolveStreamUrl", `HTTP ${res.status} for ${videoUrl}`);
        return null;
      }

      const html = await res.text();

      const iframeMatch = html.match(/<iframe[^>]*src="([^"]+)"[^>]*>/);
      if (!iframeMatch) {
        log("resolveStreamUrl", "No iframe found in bridge page");
        return null;
      }

      log("resolveStreamUrl", `Extracted iframe URL: ${iframeMatch[1]}`);
      return iframeMatch[1];
    } catch (error) {
      log("resolveStreamUrl", `Failed to resolve ${videoUrl}`, error);
      return null;
    }
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
