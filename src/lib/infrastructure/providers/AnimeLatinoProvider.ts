import { AbstractProvider } from "../../domain/abstractProvider";
import type {
    Anime,
    AnimeDetail,
    AutocompleteAnime,
    HomeData,
    VideoServer
} from "../../domain/entities";
import type { IContentProvider, IHtmlParser, IMetricsTracker, IRscParser, ISessionManager, ISiteVersionManager } from "../../domain/interfaces";
import { ProviderError } from "../../utils/errors";
import { log } from "../../utils/logger";
import { cleanTitle } from "../../utils/text";
import { ANIMELATINO_CONFIG } from "../../config/providerConfigs";
import { ParserUtils } from "../parsers/ParserUtils";
import { AnimeOrchestrator } from "../parsers/AnimeOrchestrator";
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

  private orchestrator: AnimeOrchestrator;
  private htmlParser: IHtmlParser;
  private rscParser: IRscParser;
  private versionManager: ISiteVersionManager;
  private metrics: IMetricsTracker;

  constructor(
    sessionManager: ISessionManager,
    baseUrl: string,
    orchestrator: AnimeOrchestrator,
    htmlParser: IHtmlParser,
    rscParser: IRscParser,
    versionManager: ISiteVersionManager,
    metrics: IMetricsTracker,
  ) {
    super(sessionManager, baseUrl);
    this.orchestrator = orchestrator;
    this.htmlParser = htmlParser;
    this.rscParser = rscParser;
    this.versionManager = versionManager;
    this.metrics = metrics;
  }

  // ——— Public API ———

  async getHomeData(options?: { signal?: AbortSignal }): Promise<HomeData> {
    const homeEndpoint = ANIMELATINO_CONFIG.endpoints?.home || "/";
    const res = await this.fetchWithSession(homeEndpoint, options || {});
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
      `/api/anime/search?q=${encodeURIComponent(query)}`,
      options || {}
    );

    if (!res.ok) {
      throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
    }

    const json = await res.json();
    const items = json.data || [];

    if (!Array.isArray(items)) {
      throw new ProviderError(`Unexpected response format for query: ${query}`, "UNKNOWN");
    }

    return items.map((item: { name: string; slug: string; poster: string }) => ({
      title: cleanTitle(item.name),
      image: item.poster ? (item.poster.startsWith("http") ? item.poster : `${TMDB_IMAGE_BASE}${item.poster}`) : "",
      url: item.slug,
      status: "",
    }));
  }

  async getSuggestions(query: string, options?: { signal?: AbortSignal }): Promise<AutocompleteAnime[]> {
    const res = await this.fetchWithSession(
      `/api/anime/search?q=${encodeURIComponent(query)}`,
      options || {}
    );

    if (!res.ok) {
      throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
    }

    const json = await res.json();
    const items = json.data || [];

    if (!Array.isArray(items)) {
      throw new ProviderError(`Unexpected response format for query: ${query}`, "UNKNOWN");
    }

    return items.map((item: { name: string; slug: string; poster: string; type: string }) => ({
      name: item.name,
      slug: item.slug,
      type: item.type,
      poster: item.poster,
    }));
  }

  async getDetails(slug: string, options?: { signal?: AbortSignal }): Promise<AnimeDetail | null> {
    const res = await this.fetchWithSession(`/anime/${slug}`, options || {});
    
    if (res.status === 404) return null;
    
    if (!res.ok) {
      throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
    }

    const html = await res.text();
    return this.orchestrator.parseAnimeDetail(html, slug);
  }

  async getEpisodeServers(slug: string, number: string, options?: { signal?: AbortSignal }): Promise<VideoServer[]> {
    const res = await this.fetchWithSession(`/ver/${slug}/${number}`, options || {});
    
    if (!res.ok) {
      throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
    }

    const html = await res.text();

    const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
    for (const match of scripts) {
      const text = match[1];
      if (!text.includes("self.__next_f.push")) continue;

      const p = this.rscParser.parseRscPayload(text);
      if (!p || !p.includes('"players":')) continue;

      const j = ParserUtils.extractJson(p, '"players":', "[", "]");
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

        return servers;
      } catch (e: unknown) {
        log("getEpisodeServers", `JSON parse failed for ${slug} ep ${number}`, e);
      }
    }

    throw new ProviderError(`No Delta servers extracted for ${slug} ep ${number}`, "UNKNOWN");
  }

  async resolveStreamUrl(videoUrl: string, options?: { signal?: AbortSignal }): Promise<string | null> {
    const res = await this.fetchWithSession(videoUrl, options || {});
    if (!res.ok) {
      throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
    }

    const html = await res.text();

    const iframeMatch = html.match(/<iframe[^>]*src="([^"]+)"[^>]*>/);
    if (!iframeMatch) {
      throw new ProviderError("No iframe found in bridge page", "UNKNOWN");
    }

    log("resolveStreamUrl", `Extracted iframe URL: ${iframeMatch[1]}`);
    return iframeMatch[1];
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
