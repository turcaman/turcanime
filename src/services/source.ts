import { TIMEOUTS } from "../config/cache";
import { SOURCE_CONFIG, LANGUAGE_MAP } from "../config/source";
import { logger } from "../utils/logger";
import { SourceError } from "../utils/errors";
import { backoffDelay } from "../utils/math";
import { unwrapCookies, mergeCookies } from "./cookies";
import { sessionManager, ensureFreshSession } from "./session";
import { HtmlParser, cleanTitle, extractJson } from "./parsers";
import { extractBest } from "./extractors";
import type {
  AnimeDetail,
  HomeData,
  VideoServer,
  StreamUrlResult,
} from "../types";


async function fetchWithSession(path: string, options: RequestInit = {}): Promise<Response> {
  // Proactive refresh first so an aged session renews before any request
  // fires; then wait for the shared valid gate. No fire-and-forget.
  await ensureFreshSession();
  await sessionManager.waitForCookies();

  const session = await sessionManager.getSession();
  const rawCookies = unwrapCookies(session?.cookies ?? "");
  const baseUrl = SOURCE_CONFIG.baseUrl;

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

  for (let attempt = 0; attempt < TIMEOUTS.MAX_ATTEMPTS; attempt++) {
    let timedOut = false;
    if (options.signal?.aborted) {
      // Navigation away or a newer request superseded this one: abort so
      // every store treats it as a silent cancellation, not a failure.
      const cancelled = new Error("Request cancelled");
      cancelled.name = "AbortError";
      throw cancelled;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, TIMEOUTS.REQUEST_TIMEOUT);
    const onExternalAbort = () => controller.abort();
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else options.signal.addEventListener("abort", onExternalAbort, { once: true });
    }
    const hasMoreAttempts = attempt < TIMEOUTS.MAX_ATTEMPTS - 1;

    try {
      const res = await fetch(url, { ...options, headers, signal: controller.signal });

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
            if (merged !== s.cookies) {
              logger.debug("fetch", `Cookie merge ${s.cookies.length}→${merged.length} chars`);
              await sessionManager.setSession({ ...s, cookies: merged });
            }
          }
        } catch {
          // Don't let cookie capture fail the request
        }
      }

      if (!res.ok) {
        logger.info("fetch", `HTTP ${res.status} for ${url}`);

        if (res.status === 403 || res.status === 401) {
          logger.info("fetch", `Auth error ${res.status} detected, entering ladder`);
          throw new SourceError("Authentication failed - session invalid", "AUTH_ERROR");
        }

        // Retry only transient statuses (5xx, 429); 4xx errors are final
        const retryable = res.status >= 500 || res.status === 429;
        if (retryable && hasMoreAttempts) {
          logger.info("fetch", `Retrying (${attempt + 1}/${TIMEOUTS.MAX_ATTEMPTS}) for HTTP ${res.status}: ${url}`);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay(attempt)));
          continue;
        }

        // Cloudflare challenges arrive as non-ok HTML pages; route them into
        // the session refresh ladder instead of reporting a network error.
        try {
          if (isChallengeHtml(await res.clone().text())) {
            logger.info("fetch", `Challenge body on HTTP ${res.status}, entering ladder`);
            throw new SourceError("Challenge page — session invalid", "AUTH_ERROR");
          }
        } catch (e: unknown) {
          if (e instanceof SourceError) throw e;
        }
      }
      logger.debug("fetch", `OK ${res.status} for ${url}`);
      return res;
    } catch (error) {
      if (error instanceof SourceError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        if (timedOut && !options.signal?.aborted) {
          logger.warn("fetch", `Timeout (${TIMEOUTS.REQUEST_TIMEOUT / 1000}s, attempt ${attempt + 1}/${TIMEOUTS.MAX_ATTEMPTS}) for ${url}`);
          throw new SourceError("Request timed out", "TIMEOUT");
        }
        throw error; // external abort: navigation away, not a failure
      }
      logger.warn("fetch", `Network error (attempt ${attempt + 1}/${TIMEOUTS.MAX_ATTEMPTS}) for ${url}`, error);
      if (hasMoreAttempts) {
        logger.info("fetch", `Retrying (${attempt + 1}/${TIMEOUTS.MAX_ATTEMPTS}) for network error: ${url}`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay(attempt)));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onExternalAbort);
    }
  }

  throw new Error("Unreachable: MAX_ATTEMPTS is 0");
}

const htmlParser = new HtmlParser();

function isChallengeHtml(html: string): boolean {
  return (
    html.includes("<title>Just a moment") ||
    html.includes("<title>Attention Required") ||
    html.includes('id="challenge-form"') ||
    html.includes('id="challenge-error-text"') ||
    html.includes('id="cf-challenge-running"')
  );
}

async function getHomeData(options?: { signal?: AbortSignal }): Promise<HomeData> {
  const homeEndpoint = SOURCE_CONFIG.homeEndpoint;
  const res = await fetchWithSession(homeEndpoint, options ?? {});
  if (!res.ok) throw new SourceError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
  const html = await res.text();
  const recent = htmlParser.parseCards(html);
  if (recent.length === 0) {
    if (isChallengeHtml(html)) throw new SourceError("Challenge page — session invalid", "AUTH_ERROR");
    throw new SourceError("No cards extracted — site structure may have changed", "UNKNOWN");
  }
  return { recent };
}

export interface RawSearchItem {
  name: string;
  slug: string;
  poster: string;
  type?: string;
}

// Raw search data shared by search results and suggestions so both hit the endpoint once per query
async function searchRaw(query: string, options?: { signal?: AbortSignal }): Promise<RawSearchItem[]> {
  const res = await fetchWithSession(`/api/anime/search?q=${encodeURIComponent(query)}`, options ?? {});
  if (!res.ok) throw new SourceError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
  const text = await res.text();
  let json: { data?: unknown };
  try {
    json = JSON.parse(text) as { data?: unknown };
  } catch {
    if (isChallengeHtml(text)) throw new SourceError("Challenge page — session invalid", "AUTH_ERROR");
    throw new SourceError(`Unexpected response format for query: ${query}`, "UNKNOWN");
  }
  const items = json.data ?? [];
  if (!Array.isArray(items)) throw new SourceError(`Unexpected response format for query: ${query}`, "UNKNOWN");
  return items as RawSearchItem[];
}

async function getDetails(slug: string, options?: { signal?: AbortSignal }): Promise<AnimeDetail | null> {
  const res = await fetchWithSession(`/anime/${slug}`, options ?? {});
  if (res.status === 404) return null;
  if (!res.ok) throw new SourceError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
  const html = await res.text();
  const detail = parseAnimeDetail(html, slug);
  if (detail.episodes.length === 0) {
    if (isChallengeHtml(html) || (!detail.title && !detail.image && !detail.synopsis)) {
      throw new SourceError("Challenge page — session invalid", "AUTH_ERROR");
    }
    throw new SourceError(`No episodes extracted for ${slug}`, "UNKNOWN");
  }
  return detail;
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
  if (!res.ok) throw new SourceError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
  const html = await res.text();

  const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
  for (const match of scripts) {
    const text = match[1]!;
    if (!text.includes("self.__next_f.push")) continue;

    const p = htmlParser.parseRscPayload(text);
    if (!p || !p.includes('"players":')) continue;

    const j = extractJson(p, '"players":', "[", "]");
    if (!j) continue;

    try {
      const players = JSON.parse(j);
      const servers: VideoServer[] = [];

      for (const player of players) {
        if (player.server_name !== "Delta") continue;

        servers.push({
          id: String(player.id),
          title: player.server_name,
          url: player.bridge_url,
          language: LANGUAGE_MAP[player.language] ?? player.language,
        });
      }

      return servers;
    } catch (e: unknown) {
      logger.warn("fetch", `JSON parse failed for ${slug} ep ${number}`, e);
    }
  }

  throw new SourceError(`No Delta servers extracted for ${slug} ep ${number}`, "UNKNOWN");
}

async function resolveStreamUrl(videoUrl: string, options?: { signal?: AbortSignal }): Promise<StreamUrlResult | null> {
  logger.debug("fetch", `Bridge URL: ${videoUrl.slice(0, 80)}`);

  logger.debug("fetch", "Fetching bridge page via fetchWithSession");
  const res = await fetchWithSession(videoUrl, options ?? {});
  if (!res.ok) throw new SourceError(`HTTP Error: ${res.status}`, "NETWORK_ERROR");
  const html = await res.text();
  const m = html.match(/<iframe[^>]*src="([^"]+)"[^>]*>/);
  if (!m) throw new SourceError("No iframe in bridge page", "UNKNOWN");
  const iframeUrl = m[1]!;

  logger.debug("fetch", `Iframe URL: ${iframeUrl.slice(0, 100)}`);

  if (iframeUrl.includes("/e/")) {
    logger.debug("fetch", "/e/ detected, calling extractBest...");
    const session = await sessionManager.getSession();
    const result = await extractBest(iframeUrl, {
      signal: options?.signal,
      userAgent: session?.userAgent,
    });
    if (result) {
      logger.debug("fetch", `extractBest OK: ${result.url.slice(0, 80)}`);
      return result;
    }
  }

  return { url: iframeUrl };
}

export const source = {
  getHomeData,
  searchRaw,
  getDetails,
  getEpisodeServers,
  resolveStreamUrl,
};
