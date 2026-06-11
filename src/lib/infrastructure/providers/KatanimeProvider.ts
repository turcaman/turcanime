import { parse } from "node-html-parser";
import type { IContentProvider } from "../../domain/interfaces";
import type { Anime, AnimeDetail, AutocompleteAnime, Episode, HomeData, VideoServer } from "../../domain/entities";
import { logger } from "../../utils/logger";

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

export class KatanimeProvider implements IContentProvider {
  name = "Katanime";
  requiresSession = false;
  readonly baseUrl = "https://katanime.net";

  private getHeaders(): Record<string, string> {
    return {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      "Referer": `${this.baseUrl}/`,
    };
  }

  private async fetchText(url: string, options?: { signal?: AbortSignal }): Promise<string> {
    const headers = this.getHeaders();
    const res = await fetch(url, { headers, signal: options?.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
  }

  private async fetchJSON<T>(url: string, body: string, options?: { signal?: AbortSignal }): Promise<T> {
    const headers = this.getHeaders();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": this.baseUrl,
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

    const html = await this.fetchText(`${this.baseUrl}/anime/${slug}`, options);
    const root = parse(html);

    const titleEl = root.querySelector(".comics-title");
    if (titleEl == null) return null;
    const title = titleEl.text.trim();

    const synopsis = root.querySelector("#sinopsis p")?.text.trim() ?? "";
    const genreEls = root.querySelectorAll(".anime-genres a");
    const genres = genreEls.map((el) => el.text.trim()).filter((g) => g !== "");

    const statusText = root.querySelector(".details-by #estado")?.text.trim() ?? "";
    const status = statusText.toLowerCase().includes("finalizado") ? "Completed" : "Ongoing";

    const posterImg = root.querySelector(".Comics-detail-img img") ?? root.querySelector("img[alt]");
    const poster = this.getImageUrl(posterImg);

    const episodes = await this.fetchEpisodes(root, slug, options);

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

  private async fetchEpisodes(root: ReturnType<typeof parse>, _slug: string, options?: { signal?: AbortSignal }): Promise<Episode[]> {
    const pagination = root.querySelector("._pagination");
    if (pagination == null) return [];

    const paginationUrl = pagination.getAttribute("abs:data-url") ?? pagination.getAttribute("data-url") ?? "";
    if (paginationUrl === "") return [];

    const token = root.querySelector("[name=\"csrf-token\"]")?.getAttribute("content") ?? "";
    if (token === "") return [];

    const firstPage = await this.fetchEpisodePage(paginationUrl, token, "1", options);
    const allEpisodes = [...firstPage.episodes];

    if (firstPage.pages > 1) {
      for (let p = 2; p <= firstPage.pages; p++) {
        const pageData = await this.fetchEpisodePage(paginationUrl, token, String(p), options);
        allEpisodes.push(...pageData.episodes);
      }
    }

    return allEpisodes.reverse();
  }

  private async fetchEpisodePage(
    url: string,
    token: string,
    page: string,
    options?: { signal?: AbortSignal },
  ): Promise<{ episodes: Episode[]; pages: number }> {
    try {
      const body = `_token=${encodeURIComponent(token)}&pagina=${page}`;
      const data = await this.fetchJSON<EpisodePage>(url, body, options);
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

  async getEpisodeServers(_slug: string, _number: string, _options?: { signal?: AbortSignal }): Promise<VideoServer[]> {
    return [];
  }

  async resolveStreamUrl(_videoUrl: string, _options?: { signal?: AbortSignal }): Promise<string | null> {
    return null;
  }
}
