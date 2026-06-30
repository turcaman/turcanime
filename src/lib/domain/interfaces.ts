import type { Anime, AnimeDetail, AutocompleteAnime, Episode, HomeData, VideoServer } from "./entities";

/** Parses HTML responses from the anime site into structured data. */
export interface IHtmlParser {
  parseCards(html: string): Anime[];
  parseEpisodes(html: string, slug: string): Episode[];
  parseEpisodesFromHtml(html: string, slug: string): Episode[];
  extractMetaTags(html: string): { title: string | null; banner: string | null; description: string | null };
  extractSynopsisFromDom(html: string): string | null;
  extractTitleFromHtml(html: string): string;
  extractStatusFromHtml(html: string): string;
  extractSynopsisFromJsonLd(html: string): string | null;
  extractImageFromJsonLd(html: string): string | null;
  extractGenresFromJsonLd(html: string): string[];
}

/** Parses React Server Component (RSC) payloads for streaming data. */
export interface IRscParser {
  parseRscPayload(text: string): string;
  extractPosterUrl(rsc: string): string;
  extractSynopsis(rsc: string, fullHtml: string): string | null;  parseAllFromScripts(
    html: string
  ): { poster: string; synopsis: string | null; relations: import("./entities").AnimeRelations | null };
}

/** Result of resolving a stream URL — includes optional browser-like headers. */
export interface StreamUrlResult {
  url: string;
  headers?: Record<string, string>;
}

/** Primary content provider interface for fetching anime data. */
export interface IContentProvider {
  name: string;
  getHomeData(options?: { signal?: AbortSignal }): Promise<HomeData>;
  search(query: string, options?: { signal?: AbortSignal }): Promise<Anime[]>;
  getSuggestions(query: string, options?: { signal?: AbortSignal }): Promise<AutocompleteAnime[]>;
  getDetails(slug: string, options?: { signal?: AbortSignal }): Promise<AnimeDetail | null>;
  getEpisodeServers(slug: string, number: string, options?: { signal?: AbortSignal }): Promise<VideoServer[]>;
  resolveStreamUrl(videoUrl: string, options?: { signal?: AbortSignal }): Promise<StreamUrlResult | null>;
}

/** Key-value storage abstraction (AsyncStorage wrapper). */
export interface IStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
}

/** Browser session state for authenticated requests. */
export interface ISession {
  cookies: string;
  userAgent: string;
}

/** Manages session lifecycle: initialization, refresh, and invalidation. */
export interface ISessionManager {
  initialize(): Promise<void>;
  getSession(): Promise<ISession | null>;
  setSession(session: ISession): Promise<void>;
  waitForCookies(): Promise<void>;
  invalidateCookies(): Promise<void>;
}

/** WebView message types for stream extraction communication. */
export type WebViewMessageData =
  | { type: "DECRYPTION_RESULT"; id: string; data: string | null; error?: string }
  | { type: "EMBED_VIDEO_URL"; url: string }
  | { type: "SESSION"; session: ISession }
  | { type: "RAW"; data: string }
  | { type: "LOG"; data: string };

/** Bridges React Native with WebView for session management. */
export interface IWebViewBridge {
  handleMessage(message: string): { type: string; data: WebViewMessageData } | null;
  registerNavigation(fn: (uri: string) => void): void;
  navigateTo(uri: string): void;
  notifyPageLoaded(): void;
  /** Navigate the WebView to a URL and wait for the extracted iframe/video URL. */
  fetchViaWebView(url: string, timeout?: number): Promise<string>;
  hasPendingBridgeRequest(): boolean;
  resolveBridge(url: string): void;
  rejectBridge(error: string): void;
}
