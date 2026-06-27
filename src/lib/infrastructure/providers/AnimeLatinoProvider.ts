import { AbstractProvider } from "../../domain/abstractProvider";
import type {
    Anime,
    AnimeDetail,
    AutocompleteAnime,
    HomeData,
    VideoServer
} from "../../domain/entities";
import type { IContentProvider, IHtmlParser, IMetricsTracker, IRscParser, ISessionManager, ISiteVersionManager, IWebViewBridge, StreamUrlResult } from "../../domain/interfaces";
import { ProviderError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import { cleanTitle } from "../../utils/text";
import { ANIMELATINO_CONFIG } from "../../config/providerConfigs";
import { ParserUtils } from "../parsers/ParserUtils";
import { AnimeOrchestrator } from "../parsers/AnimeOrchestrator";
import { TMDB_IMAGE_BASE } from "../../config/images";
import { extractBest } from "../services/ByseExtractor";

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

  private webViewBridge: IWebViewBridge;
  private orchestrator: AnimeOrchestrator;
  private htmlParser: IHtmlParser;
  private rscParser: IRscParser;
  private versionManager: ISiteVersionManager;
  private metrics: IMetricsTracker;

  constructor(
    sessionManager: ISessionManager,
    baseUrl: string,
    webViewBridge: IWebViewBridge,
    orchestrator: AnimeOrchestrator,
    htmlParser: IHtmlParser,
    rscParser: IRscParser,
    versionManager: ISiteVersionManager,
    metrics: IMetricsTracker,
  ) {
    super(sessionManager, baseUrl);
    this.webViewBridge = webViewBridge;
    this.orchestrator = orchestrator;
    this.htmlParser = htmlParser;
    this.rscParser = rscParser;
    this.versionManager = versionManager;
    this.metrics = metrics;
  }

  async getHomeData(options?: { signal?: AbortSignal }): Promise<HomeData> {
    const homeEndpoint = ANIMELATINO_CONFIG.endpoints?.home ?? "/";
    const res = await this.fetchWithSession(homeEndpoint, options ?? {});
    const html = await res.text();

    await this.versionManager.checkAndInvalidateIfNeeded(html);

    const recent = this.parseCardsWithMetrics(html);

    if (recent.length === 0) {
      logger.info("getHomeData", "No cards extracted — site structure may have changed");
    }

    return { recent };
  }

  async search(query: string, options?: { signal?: AbortSignal }): Promise<Anime[]> {
    const res = await this.fetchWithSession(
      `/api/anime/search?q=${encodeURIComponent(query)}`,
      options ?? {}
    );

    if (!res.ok) {
      throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
    }

    const json = await res.json();
    const items = json.data ?? [];

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
      options ?? {}
    );

    if (!res.ok) {
      throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
    }

    const json = await res.json();
    const items = json.data ?? [];

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
    const res = await this.fetchWithSession(`/anime/${slug}`, options ?? {});
    
    if (res.status === 404) return null;
    
    if (!res.ok) {
      throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
    }

    const html = await res.text();
    return this.orchestrator.parseAnimeDetail(html, slug);
  }

  async getEpisodeServers(slug: string, number: string, options?: { signal?: AbortSignal }): Promise<VideoServer[]> {
    const res = await this.fetchWithSession(`/ver/${slug}/${number}`, options ?? {});
    
    if (!res.ok) {
      throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
    }

    const html = await res.text();

    const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
    for (const match of scripts) {
      const text = match[1]!;
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
            language: languageMap[player.language] ?? player.language,
          });
        }

        return servers;
      } catch (e: unknown) {
        logger.warn("getEpisodeServers", `JSON parse failed for ${slug} ep ${number}`, e);
      }
    }

    throw new ProviderError(`No Delta servers extracted for ${slug} ep ${number}`, "UNKNOWN");
  }

  async resolveStreamUrl(videoUrl: string, options?: { signal?: AbortSignal }): Promise<StreamUrlResult | null> {
    logger.info("resolveStreamUrl", `Bridge URL: ${videoUrl.slice(0, 80)}`);

    let iframeUrl: string | null = null;
    let currentUrl = videoUrl;
    const parsed = currentUrl.match(/\/v\/(.+)-episodio-(\d+)\//);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        logger.info("resolveStreamUrl", `WebView bridge attempt ${attempt + 1}: ${currentUrl.slice(0, 80)}`);
        iframeUrl = await this.webViewBridge.fetchViaWebView(currentUrl, 10000);
        logger.info("resolveStreamUrl", `WebView bridge OK: ${iframeUrl.slice(0, 100)}`);
        break;
      } catch (e: unknown) {
        logger.warn("resolveStreamUrl", `Attempt ${attempt + 1} failed: ${e instanceof Error ? e.message : String(e)}`);
        if (attempt === 0 && parsed) {
          logger.info("resolveStreamUrl", "Re-fetching servers for fresh cookies...");
          try {
            await this.getEpisodeServers(parsed[1]!, parsed[2]!, options ?? {});
            continue;
          } catch (e2: unknown) {
            logger.warn("resolveStreamUrl", `Re-fetch servers failed: ${e2 instanceof Error ? e2.message : String(e2)}`);
          }
        }
        break;
      }
    }

    if (iframeUrl == null) {
      logger.info("resolveStreamUrl", "Fallback: fetchWithSession");
      try {
        const res = await this.fetchWithSession(currentUrl, options ?? {});
        logger.info("resolveStreamUrl", `fetchWithSession status: ${res.status}`);
        if (!res.ok) {
          throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
        }
        const html = await res.text();
        const m = html.match(/<iframe[^>]*src="([^"]+)"[^>]*>/);
        if (!m) throw new ProviderError("No iframe in bridge page", "UNKNOWN");
        iframeUrl = m[1]!;
      } catch (e: unknown) {
        logger.error("resolveStreamUrl", "Fallback failed", e);
        throw e;
      }
    }

    logger.info("resolveStreamUrl", `Iframe URL: ${iframeUrl.slice(0, 100)}`);

    if (iframeUrl.includes("/e/")) {
      logger.info("resolveStreamUrl", "/e/ detected, calling extractBest...");
      const session = await this.sessionManager.getSession();
      const result = await extractBest(iframeUrl, {
        signal: options?.signal,
        userAgent: session?.userAgent,
      });
      if (result) {
        logger.info("resolveStreamUrl", `extractBest OK: ${result.url.slice(0, 80)}`);
        return result;
      }
    }

    return { url: iframeUrl };
  }

  private parseCardsWithMetrics(html: string): Anime[] {
    const result = this.htmlParser.parseCards(html);
    if (result.strategyUsed !== "none") {
      this.metrics.record(result.strategyUsed, result.success);
    }
    return result.cards;
  }
}
