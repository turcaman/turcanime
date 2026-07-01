import { TIMEOUTS } from "../config/cache";
import { ANIMELATINO_CONFIG } from "../config/animeLatino";
import { logger } from "../utils/logger";
import { ProviderError } from "../utils/errors";
import { unwrapCookies, mergeCookies } from "./cookies";
import { sessionManager } from "./session";
import { webViewBridge } from "./webview";
import { HtmlParser, ParserUtils } from "./parsers";
import { extractBest } from "./byse";
import type {
  Anime,
  AnimeDetail,
  AutocompleteAnime,
  HomeData,
  VideoServer,
  StreamUrlResult,
} from "../types";

// ─── Fetch with session ───

async function fetchWithSession(path: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
  await sessionManager.waitForCookies();

  const session = await sessionManager.getSession();
  const rawCookies = unwrapCookies(session?.cookies ?? "");
  const baseUrl = ANIMELATINO_CONFIG.baseUrl;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    "User-Agent": session?.userAgent ?? "",
    Cookie: rawCookies,
    Referer: baseUrl + "/",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
  };

  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;

  try {
    const res = await fetch(url, { ...options, headers, signal: options.signal });

    // Capture Set-Cookie headers
    const setCookies: string[] = [];
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        setCookies.push(value);
      }
    });
    if (setCookies.length > 0) {
      try {
        const s = await sessionManager.getSession();
        if (s) {
          const merged = mergeCookies(s.cookies, setCookies);
          await sessionManager.setSession({ ...s, cookies: merged });
        }
      } catch {
        // Don't let cookie capture fail the request
      }
    }

    if (!res.ok) {
      logger.info("fetch", `HTTP ${res.status} for ${url}`);

      if (res.status === 403 || res.status === 401) {
        logger.info("fetch", "Auth error detected, triggering session invalidation");
        const error = new Error("Authentication failed - session invalid") as Error & { type: string };
        error.type = "AUTH_ERROR";
        throw error;
      }

      // Retry 403/network errors once
      if (retryCount < 1) {
        logger.info("fetch", `Smart retry (1/1) for HTTP ${res.status}: ${url}`);
        await new Promise((resolve) => setTimeout(resolve, TIMEOUTS.RETRY_DELAY));
        return fetchWithSession(path, options, retryCount + 1);
      }
    }
    return res;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    logger.warn("fetch", `Network error for ${url}`, error);
    if (retryCount < 1) {
      logger.info("fetch", `Smart retry (1/1) for network error: ${url}`);
      await new Promise((resolve) => setTimeout(resolve, TIMEOUTS.RETRY_DELAY));
      return fetchWithSession(path, options, retryCount + 1);
    }
    throw error;
  }
}

// ─── Helpers ───

function cleanTitle(raw: string): string {
  return raw.replace(/^Ver\s+/i, "").replace(/\s+Sub\s+.*$/i, "").trim();
}

// ─── Provider ───

const htmlParser = new HtmlParser();
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w300";

async function getHomeData(options?: { signal?: AbortSignal }): Promise<HomeData> {
  const homeEndpoint = ANIMELATINO_CONFIG.endpoints?.home ?? "/";
  const res = await fetchWithSession(homeEndpoint, options ?? {});
  const html = await res.text();
  const recent = htmlParser.parseCards(html);
  if (recent.length === 0) {
    logger.info("getHomeData", "No cards extracted — site structure may have changed");
  }
  return { recent };
}

async function search(query: string, options?: { signal?: AbortSignal }): Promise<Anime[]> {
  const res = await fetchWithSession(`/api/anime/search?q=${encodeURIComponent(query)}`, options ?? {});
  if (!res.ok) throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
  const json = await res.json();
  const items = json.data ?? [];
  if (!Array.isArray(items)) throw new ProviderError(`Unexpected response format for query: ${query}`, "UNKNOWN");
  return items.map((item: { name: string; slug: string; poster: string }) => ({
    title: cleanTitle(item.name),
    image: item.poster ? (item.poster.startsWith("http") ? item.poster : `${TMDB_IMAGE_BASE}${item.poster}`) : "",
    url: item.slug,
    status: "",
  }));
}

async function getSuggestions(query: string, options?: { signal?: AbortSignal }): Promise<AutocompleteAnime[]> {
  const res = await fetchWithSession(`/api/anime/search?q=${encodeURIComponent(query)}`, options ?? {});
  if (!res.ok) throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
  const json = await res.json();
  const items = json.data ?? [];
  if (!Array.isArray(items)) throw new ProviderError(`Unexpected response format for query: ${query}`, "UNKNOWN");
  return items.map((item: { name: string; slug: string; poster: string; type: string }) => ({
    name: item.name,
    slug: item.slug,
    type: item.type,
    poster: item.poster,
  }));
}

async function getDetails(slug: string, options?: { signal?: AbortSignal }): Promise<AnimeDetail | null> {
  const res = await fetchWithSession(`/anime/${slug}`, options ?? {});
  if (res.status === 404) return null;
  if (!res.ok) throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
  const html = await res.text();
  return parseAnimeDetail(html, slug);
}

function parseAnimeDetail(html: string, slug: string): AnimeDetail {
  const meta = htmlParser.extractMetaTags(html);
  const rscData = htmlParser.parseAllFromScripts(html);

  const title = htmlParser.extractTitleFromHtml(html);
  const status = htmlParser.extractStatusFromHtml(html);
  const episodes = htmlParser.parseEpisodes(html, slug);

  const domSynopsis = htmlParser.extractSynopsisFromDom(html);
  const jsonLdSynopsis = htmlParser.extractSynopsisFromJsonLd(html);
  const jsonLdImage = htmlParser.extractImageFromJsonLd(html);
  const synopsis = rscData.synopsis ?? jsonLdSynopsis ?? domSynopsis ?? meta.description ?? "";

  const image = rscData.poster || (jsonLdImage ?? meta.banner ?? "");
  const genres = htmlParser.extractGenresFromJsonLd(html);

  return {
    title: cleanTitle(title ?? meta.title ?? ""),
    image,
    synopsis,
    banner: meta.banner ?? image,
    poster: image,
    status,
    genres,
    episodes,
    relations: rscData.relations,
    url: slug,
  };
}

async function getEpisodeServers(slug: string, number: string, options?: { signal?: AbortSignal }): Promise<VideoServer[]> {
  const res = await fetchWithSession(`/ver/${slug}/${number}`, options ?? {});
  if (!res.ok) throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
  const html = await res.text();

  const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
  for (const match of scripts) {
    const text = match[1]!;
    if (!text.includes("self.__next_f.push")) continue;

    const p = htmlParser.parseRscPayload(text);
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

async function resolveStreamUrl(videoUrl: string, options?: { signal?: AbortSignal }): Promise<StreamUrlResult | null> {
  logger.info("resolveStreamUrl", `Bridge URL: ${videoUrl.slice(0, 80)}`);

  let iframeUrl: string | null = null;
  let currentUrl = videoUrl;
  const parsed = currentUrl.match(/\/v\/(.+)-episodio-(\d+)\//);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      logger.info("resolveStreamUrl", `WebView bridge attempt ${attempt + 1}: ${currentUrl.slice(0, 80)}`);
      iframeUrl = await webViewBridge.fetchViaWebView(currentUrl, 10000);
      logger.info("resolveStreamUrl", `WebView bridge OK: ${iframeUrl.slice(0, 100)}`);
      break;
    } catch (e: unknown) {
      logger.warn("resolveStreamUrl", `Attempt ${attempt + 1} failed: ${e instanceof Error ? e.message : String(e)}`);
      if (attempt === 0 && parsed) {
        logger.info("resolveStreamUrl", "Re-fetching servers for fresh cookies...");
        try {
          await getEpisodeServers(parsed[1]!, parsed[2]!, options ?? {});
          continue;
        } catch {
          // fall through
        }
      }
      break;
    }
  }

  if (iframeUrl == null) {
    logger.info("resolveStreamUrl", "Fallback: fetchWithSession");
    try {
      const res = await fetchWithSession(currentUrl, options ?? {});
      logger.info("resolveStreamUrl", `fetchWithSession status: ${res.status}`);
      if (!res.ok) throw new ProviderError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
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
    const session = await sessionManager.getSession();
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

// ─── Public exports ───

export const animeLatino = {
  getHomeData,
  search,
  getSuggestions,
  getDetails,
  getEpisodeServers,
  resolveStreamUrl,
};
