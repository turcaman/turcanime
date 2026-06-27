export type AppErrorType = "NETWORK_ERROR" | "NOT_FOUND" | "SERVER_ERROR" | "AUTH_ERROR" | "UNKNOWN";

export interface AppError {
  type: AppErrorType;
  message: string;
}

export interface Anime {
  title: string;
  image: string;
  url: string; // This is the slug
  status: string;
}

export interface Episode {
  id: string;
  number: string;
  url: string;
}

export interface AnimeDetail extends Anime {
  synopsis: string;
  banner: string;
  poster: string;
  genres: string[];
  episodes: Episode[];
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
