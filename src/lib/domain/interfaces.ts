import type { Anime, AnimeDetail, AutocompleteAnime, HomeData, VideoServer } from "./entities";

/** Primary content provider interface for fetching anime data. */
export interface IContentProvider {
  name: string;
  getHomeData(options?: { signal?: AbortSignal }): Promise<HomeData>;
  search(query: string, options?: { signal?: AbortSignal }): Promise<Anime[]>;
  getSuggestions(query: string, options?: { signal?: AbortSignal }): Promise<AutocompleteAnime[]>;
  getDetails(slug: string, options?: { signal?: AbortSignal }): Promise<AnimeDetail | null>;
  getEpisodeServers(slug: string, number: string, options?: { signal?: AbortSignal }): Promise<VideoServer[]>;
  resolveStreamUrl(videoUrl: string, options?: { signal?: AbortSignal }): Promise<string | null>;
}

/** Key-value storage abstraction (AsyncStorage wrapper). */
export interface IStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
}
