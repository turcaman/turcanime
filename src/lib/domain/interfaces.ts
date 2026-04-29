import { Anime, AnimeDetail, AutocompleteAnime, HomeData, VideoServer } from "./entities";

export interface IContentProvider {
  name: string;
  getHomeData(options?: { signal?: AbortSignal }): Promise<HomeData>;
  search(query: string, options?: { signal?: AbortSignal }): Promise<Anime[]>;
  getSuggestions(query: string): Promise<AutocompleteAnime[]>;
  getDetails(slug: string, options?: { signal?: AbortSignal }): Promise<AnimeDetail | null>;
  getEpisodeServers(slug: string, number: string): Promise<VideoServer[]>;
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
  handleMessage(message: string): { type: string; data: WebViewMessageData } | null;
  registerNavigation(fn: (uri: string) => void): void;
  registerInjection(fn: (code: string) => void): void;
  notifyPageLoaded(): void;
}
