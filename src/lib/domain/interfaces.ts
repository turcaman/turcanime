import type { Anime, AnimeDetail, AutocompleteAnime, Episode, HomeData, VideoServer } from "./entities";

// ─── Parser interfaces ─────────────────────────────────────────────────

export interface ParseResult {
  cards: Anime[];
  strategyUsed: string;
  success: boolean;
}

export interface IHtmlParser {
  parseCards(html: string): ParseResult;
  parseEpisodes(html: string, slug: string): Episode[];
  parseEpisodesFromHtml(html: string, slug: string): Episode[];
  extractMetaTags(html: string): { title: string | null; banner: string | null; description: string | null };
  extractSynopsisFromDom(html: string): string | null;
  extractTitleFromHtml(html: string): string;
  extractStatusFromHtml(html: string): string;
  extractSynopsisFromJsonLd(html: string): string | null;
  extractImageFromJsonLd(html: string): string | null;
}

export interface IRscParser {
  parseRscPayload(text: string): string;
  extractPosterUrl(rsc: string): string;
  extractSynopsis(rsc: string, fullHtml: string): string | null;
  parseAllFromScripts(html: string): { poster: string; synopsis: string | null };
}

export interface ISiteVersionManager {
  checkAndInvalidateIfNeeded(html: string): Promise<boolean>;
}

export interface IMetricsTracker {
  record(strategy: string, success: boolean): void;
}

export interface IContentProvider {
  name: string;
  getHomeData(options?: { signal?: AbortSignal }): Promise<HomeData>;
  search(query: string, options?: { signal?: AbortSignal }): Promise<Anime[]>;
  getSuggestions(query: string, options?: { signal?: AbortSignal }): Promise<AutocompleteAnime[]>;
  getDetails(slug: string, options?: { signal?: AbortSignal }): Promise<AnimeDetail | null>;
  getEpisodeServers(slug: string, number: string, options?: { signal?: AbortSignal }): Promise<VideoServer[]>;
  resolveStreamUrl(videoUrl: string, options?: { signal?: AbortSignal }): Promise<string | null>;
}

export interface IStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
}

export interface ISession {
  cookies: string;
  userAgent: string;
}

export interface ISessionManager {
  initialize(): Promise<void>;
  getSession(): Promise<ISession | null>;
  setSession(session: ISession): Promise<void>;
  refreshCookies(): Promise<void>;
  waitForCookies(): Promise<void>;
  invalidateCookies(): Promise<void>;
}

export type WebViewMessageData =
  | { type: "DECRYPTION_RESULT"; id: string; data: string | null; error?: string }
  | { type: "EMBED_VIDEO_URL"; url: string }
  | { type: "SESSION"; session: ISession }
  | { type: "RAW"; data: string };

export interface IWebViewBridge {
  resolveStreamUrl(videoUrl: string): Promise<string | null>;
  resolveEmbedStreamUrl(embedUrl: string): Promise<string | null>;
  handleMessage(message: string): { type: string; data: WebViewMessageData } | null;
  registerNavigation(fn: (uri: string) => void): void;
  registerInjection(fn: (code: string) => void): void;
  navigateTo(uri: string): void;
  notifyPageLoaded(): void;
}
