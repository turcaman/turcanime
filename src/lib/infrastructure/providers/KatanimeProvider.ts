import CryptoJS from "crypto-js";
import { parse } from "node-html-parser";
import JsUnpacker from "js-unpacker";
import type { IContentProvider } from "../../domain/interfaces";
import type { Anime, AnimeDetail, AutocompleteAnime, Episode, HomeData, VideoServer } from "../../domain/entities";
import { logger } from "../../utils/logger";

interface CryptoDto {
  ct: string;
  s: string;
}

interface EpisodePage {
  ep?: {
    current_page?: number;
    data?: {
      numero?: string;
      idserie?: number;
      thumb?: string;
      created_at?: string;
      url?: string;
    }[];
    last_page?: number;
    per_page?: number;
    total?: number;
  };
}

const DECRYPTION_PASSWORD = "hanabi";
const FETCH_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url: string, options?: RequestInit & { timeout?: number }): Promise<Response> {
  const timeout = options?.timeout ?? FETCH_TIMEOUT_MS;
  const ctrl = new AbortController();
  const id = setTimeout(() => { ctrl.abort(); }, timeout);
  try {
    const { timeout: _t, ...fetchOpts } = options ?? {};
    const combinedSignal = fetchOpts.signal != null ? signalAny(fetchOpts.signal, ctrl.signal) : ctrl.signal;
    const res = await fetch(url, { ...fetchOpts, signal: combinedSignal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function signalAny(...signals: AbortSignal[]): AbortSignal {
  const ctrl = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) { ctrl.abort(sig.reason); return ctrl.signal; }
    sig.addEventListener("abort", () => { ctrl.abort(sig.reason); }, { once: true });
  }
  return ctrl.signal;
}

export class KatanimeProvider implements IContentProvider {
  name = "Katanime";
  requiresSession = false;
  readonly baseUrl = "https://katanime.net";

  private getHeaders(): Record<string, string> {
    return {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      "Referer": `${this.baseUrl}/`,
    };
  }

  private decryptKatanime(ct: string, saltHex: string, password: string): string {
    const salt = CryptoJS.enc.Hex.parse(saltHex);
    const ctWords = CryptoJS.enc.Base64.parse(ct);

    const KEY_SIZE = 8;
    const IV_SIZE = 4;
    const TOTAL_SIZE = KEY_SIZE + IV_SIZE;

    const derived = CryptoJS.lib.WordArray.create([]);
    let last = CryptoJS.lib.WordArray.create([]);

    while (derived.sigBytes / 4 < TOTAL_SIZE) {
      const hashInput = CryptoJS.lib.WordArray.create([]);
      hashInput.concat(last);
      hashInput.concat(CryptoJS.enc.Utf8.parse(password));
      hashInput.concat(salt);
      last = CryptoJS.MD5(hashInput);
      derived.concat(last);
    }

    const allWords = derived.words.slice(0, TOTAL_SIZE);
    const key = CryptoJS.lib.WordArray.create(allWords.slice(0, KEY_SIZE), KEY_SIZE * 4);
    const iv = CryptoJS.lib.WordArray.create(allWords.slice(KEY_SIZE), IV_SIZE * 4);

    const decrypted = CryptoJS.AES.decrypt(
      CryptoJS.lib.CipherParams.create({ ciphertext: ctWords }),
      key,
      { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  private async extractMp4Video(embedUrl: string): Promise<string | null> {
    try {
      const res = await fetchWithTimeout(embedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 7 Pro) AppleWebKit/537.36",
          "Referer": "https://mp4upload.com/",
        },
      });
      if (!res.ok) return null;
      const html = await res.text();

      const playerSrcMatch = html.match(/player\.src\(\{[^}]*src:\s*["']((https?|ftp)[^"']+)["']/);
      if (playerSrcMatch) return playerSrcMatch[1] ?? null;

      const srcMatch = html.match(/src:\s*["']((https?|ftp)[^"']+\.mp4[^"']*)["']/);
      if (srcMatch) return srcMatch[1] ?? null;

      return null;
    } catch {
      return null;
    }
  }

  private async extractLuluVideo(embedUrl: string): Promise<string | null> {
    try {
      const res = await fetchWithTimeout(embedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 7 Pro) AppleWebKit/537.36",
          "Referer": "https://luluvdo.com/",
        },
      });
      if (!res.ok) return null;
      const html = await res.text();

      const evalStart = html.indexOf("eval(function");
      if (evalStart === -1) return null;

      let depth = 0;
      let i = evalStart;
      while (i < html.length) {
        if (html[i] === "(") depth++;
        if (html[i] === ")") { depth--; if (depth === 0) break; }
        i++;
      }
      const evalCode = html.slice(evalStart, i + 1);
      const packedJs = evalCode.replace(/^eval/, "");

      const unpacker = new JsUnpacker(packedJs);
      const unpacked = unpacker.unpack();

      const fileMatch = unpacked.match(/file:\s*"([^"]+)"/);
      if (!fileMatch) return null;
      const masterUrl = fileMatch[1]!;

      const masterRes = await fetchWithTimeout(masterUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 7 Pro) AppleWebKit/537.36",
          "Referer": "https://luluvdo.com/",
          "Origin": "https://luluvdo.com",
        },
      });
      if (!masterRes.ok) return masterUrl;

      const masterBody = await masterRes.text();
      let bestQuality = 0;
      let bestVariant = "";

      const lines = masterBody.split("\n");
      for (let li = 0; li < lines.length; li++) {
        const streamInfMatch = lines[li]!.match(/#EXT-X-STREAM-INF:[^\n]*RESOLUTION=(\d+)x(\d+)/);
        if (streamInfMatch) {
          const width = Number.parseInt(streamInfMatch[1]!, 10);
          if (width > bestQuality && li + 1 < lines.length) {
            const nextLine = lines[li + 1]!.trim();
            if (nextLine !== "" && !nextLine.startsWith("#")) {
              bestQuality = width;
              bestVariant = nextLine;
            }
          }
        }
      }

      if (bestVariant === "") return masterUrl;

      const resolvedVariant = new URL(bestVariant, masterUrl).href;
      const masterUrlObj = new URL(masterUrl);
      const qp = masterUrlObj.searchParams;
      const variantUrlObj = new URL(resolvedVariant);
      for (const [key, val] of qp.entries()) {
        if (!variantUrlObj.searchParams.has(key)) {
          variantUrlObj.searchParams.set(key, val);
        }
      }

      return variantUrlObj.href;
    } catch {
      return null;
    }
  }

  private async fetchText(url: string, options?: { signal?: AbortSignal }): Promise<string> {
    const res = await fetch(url, { headers: this.getHeaders(), signal: options?.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
  }

  private async fetchWithCookies(url: string, options?: { signal?: AbortSignal }): Promise<{ text: string; cookies: string }> {
    const res = await fetch(url, { headers: this.getHeaders(), signal: options?.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const cookies = (typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [])
    .map((c: string) => c.split(";")[0]).join("; ");
    return { text: await res.text(), cookies };
  }

  private async fetchJSONWithCookies<T>(
    url: string, body: string, cookies: string, options?: { signal?: AbortSignal },
  ): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...this.getHeaders(),
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        "Cookie": cookies,
      },
      body,
      signal: options?.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json() as Promise<T>;
  }

  private parseAnimeCard(html: string): Anime[] {
    const root = parse(html);
    const elements = root.querySelectorAll("#article-div .full > a");
    return elements.map((el) => {
      const img = el.querySelector("img");
      const href = el.getAttribute("href") ?? "";
      return {
        title: img?.getAttribute("alt") ?? "",
        image: this.getImageUrl(img),
        url: href.replace(this.baseUrl, "").split("/").filter(Boolean).pop() ?? "",
        status: "",
      };
    }).filter((a) => a.title !== "" && a.url !== "");
  }

  private getImageUrl(img: ReturnType<typeof parse> | null): string {
    if (img == null) return "";
    for (const attr of ["data-src", "data-lazy-src", "srcset", "src"]) {
      const val = img.getAttribute(attr);
      if (val != null && !val.includes("data:image/")) {
        if (attr === "srcset") return val.split(" ")[0] ?? val;
        return val.startsWith("http") ? val : `https:${val}`;
      }
    }
    return "";
  }

  async getHomeData(options?: { signal?: AbortSignal }): Promise<HomeData> {
    const currentYear = new Date().getFullYear();
    const html = await this.fetchText(`${this.baseUrl}/animes?fecha=${currentYear}&p=1`, options);
    const recent = this.parseAnimeCard(html);
    return { recent };
  }

  async search(query: string, options?: { signal?: AbortSignal }): Promise<Anime[]> {
    if (query.trim() === "") return [];
    const html = await this.fetchText(`${this.baseUrl}/buscar?q=${encodeURIComponent(query)}&p=1`, options);
    return this.parseAnimeCard(html);
  }

  async getSuggestions(_query: string, _options?: { signal?: AbortSignal }): Promise<AutocompleteAnime[]> {
    return [];
  }

  async getDetails(slug: string, options?: { signal?: AbortSignal }): Promise<AnimeDetail | null> {
    if (slug === "") return null;

    const { text: html, cookies } = await this.fetchWithCookies(`${this.baseUrl}/anime/${slug}`, options);
    const root = parse(html);

    const titleEl = root.querySelector(".comics-title");
    if (titleEl == null) return null;
    const title = titleEl.text.trim();

    const synopsis = root.querySelector("#sinopsis p")?.text.trim().replace(/\s*\(Fuente:\s*[^)]*\)\s*$/, "") ?? "";
    const genreEls = root.querySelectorAll(".anime-genres a");
    const genres = genreEls.map((el) => el.text.trim()).filter((g) => g !== "");

    const statusText = root.querySelector(".details-by #estado")?.text.trim() ?? "";
    const status = statusText.toLowerCase().includes("finalizado") ? "Completed" : "Ongoing";

    const posterImg = root.querySelector("#animeinfo > img");
    const poster = this.getImageUrl(posterImg);

    const episodes = await this.fetchEpisodes(root, cookies, options);

    return {
      title,
      synopsis,
      banner: poster,
      poster,
      genres,
      status,
      url: slug,
      image: poster,
      episodes,
    };
  }

  private async fetchEpisodes(
    root: ReturnType<typeof parse>, cookies: string, options?: { signal?: AbortSignal },
  ): Promise<Episode[]> {
    const pagination = root.querySelector("._pagination");
    if (pagination == null) return [];

    const paginationUrl = pagination.getAttribute("abs:data-url") ?? pagination.getAttribute("data-url") ?? "";
    if (paginationUrl === "") return [];

    const token = root.querySelector("[name=\"csrf-token\"]")?.getAttribute("content") ?? "";
    if (token === "") return [];

    const firstPage = await this.fetchEpisodePage(paginationUrl, token, "1", cookies, options);
    const allEpisodes = [...firstPage.episodes];

    if (firstPage.pages > 1) {
      for (let p = 2; p <= firstPage.pages; p++) {
        const pageData = await this.fetchEpisodePage(paginationUrl, token, String(p), cookies, options);
        allEpisodes.push(...pageData.episodes);
      }
    }

    return allEpisodes.reverse();
  }

  private async fetchEpisodePage(
    url: string, token: string, page: string, cookies: string, options?: { signal?: AbortSignal },
  ): Promise<{ episodes: Episode[]; pages: number }> {
    try {
      const body = `_token=${encodeURIComponent(token)}&pagina=${page}`;
      const data = await this.fetchJSONWithCookies<EpisodePage>(url, body, cookies, options);
      const ep = data.ep;
      if (ep?.data == null) return { episodes: [], pages: 1 };

      const pages = ep.last_page ?? Math.ceil((ep.total ?? 1) / (ep.per_page ?? Number.MAX_SAFE_INTEGER));

      const episodes: Episode[] = ep.data
        .filter((d): d is { url: string; numero?: string; created_at?: string } & typeof d => d.url != null && d.url !== "")
        .map((d) => ({
          id: d.numero ?? "",
          number: d.numero ?? "",
          url: d.url.replace(this.baseUrl, "").replace(/^\//, ""),
        }));

      return { episodes, pages: Math.max(1, pages) };
    } catch (e) {
      logger.error("KatanimeProvider", "Failed to fetch episode page", e);
      return { episodes: [], pages: 1 };
    }
  }

  async getEpisodeServers(slug: string, number: string, options?: { signal?: AbortSignal }): Promise<VideoServer[]> {
    const { cookies } = await this.fetchWithCookies(`${this.baseUrl}/anime/${slug}`, options);
    const detailHtml = await this.fetchText(`${this.baseUrl}/anime/${slug}`, options);
    const detailRoot = parse(detailHtml);

    const paginationUrl = detailRoot.querySelector("._pagination")?.getAttribute("data-url") ?? "";
    const token = detailRoot.querySelector("[name=\"csrf-token\"]")?.getAttribute("content") ?? "";
    if (!paginationUrl || !token) return [];

    const firstPage = await this.fetchEpisodePage(paginationUrl, token, "1", cookies, options);
    const allEps: { number: string; url: string }[] = [...firstPage.episodes];

    if (firstPage.pages > 1) {
      for (let p = 2; p <= firstPage.pages; p++) {
        const pageData = await this.fetchEpisodePage(paginationUrl, token, String(p), cookies, options);
        allEps.push(...pageData.episodes);
      }
    }

    const match = allEps.find((e) => e.number === number);
    if (!match) return [];

    const episodeUrl = match.url.startsWith("http") ? match.url : `${this.baseUrl}/${match.url.replace(/^\//, "")}`;

    const epRes = await fetchWithTimeout(episodeUrl, {
      headers: {
        ...this.getHeaders(),
        "Cookie": cookies,
        "Referer": `${this.baseUrl}/anime/${slug}/`,
      },
      signal: options?.signal,
    });
    if (!epRes.ok) return [];
    const epHtml = await epRes.text();
    const epRoot = parse(epHtml);

    const players = epRoot.querySelectorAll('[data-player-name="Mp4Upload"], [data-player-name="LuluStream"]');

    return players.map((p, i) => ({
      id: `mp4_${i}`,
      title: p.getAttribute("data-player-name") ?? "Unknown",
      url: p.getAttribute("data-player") ?? "",
      language: "sub",
    }));
  }

  async resolveStreamUrl(videoUrl: string, options?: { signal?: AbortSignal }): Promise<{ url: string; headers?: Record<string, string> } | null> {
    try {
      const reproRes = await fetchWithTimeout(`${this.baseUrl}/reproductor?url=${encodeURIComponent(videoUrl)}`, {
        headers: {
          ...this.getHeaders(),
          "Referer": `${this.baseUrl}/`,
        },
        signal: options?.signal,
      });
      if (!reproRes.ok) return null;
      const reproHtml = await reproRes.text();

      const match = reproHtml.match(/var e = '([^']+)'/);
      if (!match) return null;

      const encrypted: CryptoDto = JSON.parse(match[1]!);
      const decrypted = this.decryptKatanime(encrypted.ct, encrypted.s, DECRYPTION_PASSWORD);
      const embedUrl = decrypted.replace(/\\\//g, "/").replace(/^"|"$/g, "");

      if (embedUrl.includes("mp4upload.com")) {
        const videoUrlResult = await this.extractMp4Video(embedUrl);
        if (videoUrlResult == null) return null;
        return { url: videoUrlResult, headers: { "Referer": "https://mp4upload.com/" } };
      }

      if (embedUrl.includes("lulu")) {
        const videoUrlResult = await this.extractLuluVideo(embedUrl);
        if (videoUrlResult == null) return null;
        return { url: videoUrlResult, headers: { "Referer": "https://luluvdo.com/", "Origin": "https://luluvdo.com" } };
      }

      return { url: embedUrl };
    } catch (e) {
      logger.error("KatanimeProvider", "resolveStreamUrl failed", e);
      return null;
    }
  }
}
