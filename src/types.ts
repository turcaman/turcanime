// ─── Error types ───
export type AppErrorType = "NETWORK_ERROR" | "NOT_FOUND" | "SERVER_ERROR" | "AUTH_ERROR" | "UNKNOWN";

export interface AppError {
  type: AppErrorType;
  message: string;
}

// ─── Anime entities ───
export interface Anime {
  title: string;
  image: string;
  url: string; // slug
  status: string;
}

export interface Episode {
  id: string;
  number: string;
  url: string;
}

export interface RelatedAnime {
  id: number;
  name: string;
  poster: string;
  slug: string;
  type: string;
  vote_average: number;
}

export interface AnimeRelations {
  prequel: RelatedAnime[];
  sequel: RelatedAnime[];
  related: RelatedAnime[];
}

export interface AnimeDetail extends Anime {
  synopsis: string;
  banner: string;
  poster: string;
  genres: string[];
  episodes: Episode[];
  relations: AnimeRelations | null;
}

export interface VideoServer {
  id: string;
  title: string;
  url: string;
  language: string;
}

export interface HomeData {
  recent: Anime[];
  sections?: { items: Anime[] }[];
}

export interface HistoryItem {
  title: string;
  image: string;
  url: string;
  number: string;
  progress?: number;
  duration?: number;
  timestamp: number;
}

export interface AutocompleteAnime {
  name: string;
  slug: string;
  type: string;
  poster: string;
}

// ─── Session ───
export interface ISession {
  cookies: string;
  userAgent: string;
}

// ─── Stream result ───
export interface StreamUrlResult {
  url: string;
  headers?: Record<string, string>;
}

// ─── Cache ───
export interface CacheEntry<T> {
  payload: T;
  expiration: number;
}

// ─── Episode pagination ───
export interface EpisodeRange {
  label: string;
  start: number;
  end: number;
}

// ─── WebView messages ───
export type WebViewMessageData =
  | { type: "DECRYPTION_RESULT"; id: string; data: string | null; error?: string }
  | { type: "EMBED_VIDEO_URL"; url: string }
  | { type: "SESSION"; session: ISession }
  | { type: "RAW"; data: string }
  | { type: "LOG"; data: string };
