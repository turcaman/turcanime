import { ANIME_CACHE } from "../../config/cacheTTLs";
import { CACHE_PREFIXES } from "../../config/cacheKeys";
import { TIMEOUTS } from "../../config/timeouts";
import { IContentProvider, ISessionManager } from "../../domain/interfaces";
import { Anime, AnimeDetail, AppError, AutocompleteAnime, HomeData } from "../../domain/entities";
import { CacheRepo } from "../../domain/repositories/cacheRepo";
import { ImageService } from "../../infrastructure/services/ImageService";
import { createCacheKey } from "../../utils/CacheUtils";
import { logger } from "../../utils/logger";

interface FetchResult<T> {
  data: T | null;
  error: AppError | null;
  fromCache: boolean;
}

interface CacheOptions<T> {
  cacheKey: string;
  cacheTtl: number;
  errorMessage: string;
  fetchFn: (signal: AbortSignal) => Promise<T>;
  force?: boolean;
}

interface AnimeFetchOptions<T> extends CacheOptions<T> {
  onSuccess?: (data: T) => void;
}

export class AnimeService {
  constructor(
    private cache: CacheRepo,
    private getProvider: () => IContentProvider,
    private sessionManager: ISessionManager,
    private imageService: ImageService,
  ) {}

  private prefetchImages(items: { image?: string }[]): void {
    this.imageService.prefetchImages(items);
  }

  private async getCachedData<T>(cacheKey: string, force: boolean): Promise<T | null> {
    if (force) return null;
    try {
      return await this.cache.get<T>(cacheKey);
    } catch {
      return null;
    }
  }

  private async handleAuthError<T>(
    cacheKey: string,
    fetchFn: (signal: AbortSignal) => Promise<T>,
    cacheTtl: number,
    onSuccess?: (data: T) => void
  ): Promise<FetchResult<T>> {
    try {
      await this.cache.clearWithPrefix(cacheKey);
      await this.sessionManager.invalidateCookies();

      const retryController = new AbortController();
      try {
        const data = await fetchFn(retryController.signal);
        await this.cache.set(cacheKey, data, cacheTtl);
        onSuccess?.(data);
        return { data, error: null, fromCache: false };
      } catch (error) {
        logger.error("animeService", `Error handling authentication error for key ${cacheKey}`, error);
        return {
          data: null,
          error: createGenericError(error as any, "Error handling authentication error"),
          fromCache: false,
        };
      }
    } catch (authError) {
      logger.error("animeService", `Authentication error handling failed for key ${cacheKey}`, authError);
      return {
        data: null,
        error: { type: "AUTH_ERROR", message: "Error al recuperar sesión. Intenta recargar." },
        fromCache: false,
      };
    }
  }

  async peekHomeCache(): Promise<HomeData | null> {
    const cacheKey = createCacheKey(CACHE_PREFIXES.HOME, '/');
    try {
      return await this.cache.get<HomeData>(cacheKey);
    } catch {
      return null;
    }
  }

  private async fetchWithCache<T>(options: AnimeFetchOptions<T>, signal: AbortSignal): Promise<FetchResult<T>> {
    const { cacheKey, cacheTtl, errorMessage, fetchFn, force, onSuccess } = options;

    const cached = await this.getCachedData<T>(cacheKey, force || false);
    if (cached) {
      return { data: cached, error: null, fromCache: true };
    }

    try {
      const data = await fetchFn(signal);
      await this.cache.set(cacheKey, data, cacheTtl);
      onSuccess?.(data);
      return { data, error: null, fromCache: false };
    } catch (e: unknown) {
      const err = e as { name?: string; type?: string; message?: string };

      if (err.name === "AbortError") {
        return { data: null, error: null, fromCache: false };
      }

      if (err.type === "AUTH_ERROR") {
        return await this.handleAuthError(cacheKey, fetchFn, cacheTtl, onSuccess);
      }

      if (err.type === "NETWORK_ERROR") {
        return { data: null, error: createNetworkError(err.message), fromCache: false };
      }

      return { data: null, error: createGenericError(err, errorMessage), fromCache: false };
    }
  }

  async fetchHomeData(signal: AbortSignal, force: boolean): Promise<FetchResult<HomeData>> {
    return await this.fetchWithCache(
      {
        cacheKey: CACHE_PREFIXES.HOME,
        cacheTtl: ANIME_CACHE.HOME,
        errorMessage: "Error al cargar la pantalla de inicio",
        fetchFn: (sig: AbortSignal) => this.getProvider().getHomeData({ signal: sig }),
        force,
        onSuccess: (data: HomeData) => (data.sections || []).forEach((s: { items: Anime[] }) => this.prefetchImages(s.items))
      },
      signal
    );
  }

  async fetchSearchData(query: string, signal: AbortSignal, force: boolean): Promise<FetchResult<Anime[]>> {
    if (!query?.trim()) {
      return { data: [], error: null, fromCache: false };
    }

    const SEARCH_TIMEOUT = TIMEOUTS.SEARCH;

    return await this.fetchWithCache(
      {
        cacheKey: createCacheKey(CACHE_PREFIXES.SEARCH, query),
        cacheTtl: ANIME_CACHE.SEARCH,
        errorMessage: "Error searching anime",
        fetchFn: async (sig: AbortSignal) => {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Search timeout")), SEARCH_TIMEOUT);
          });
          const searchPromise = this.getProvider().search(query, { signal: sig });
          return await Promise.race([searchPromise, timeoutPromise]);
        },
        force,
        onSuccess: (data) => this.prefetchImages(data)
      },
      signal
    );
  }

  async fetchSuggestionsData(query: string, signal?: AbortSignal): Promise<AutocompleteAnime[]> {
    if (!query || query.length < 3) {
      return [];
    }

    const result = await this.fetchWithCache(
      {
        cacheKey: createCacheKey(CACHE_PREFIXES.SUGGESTIONS, query),
        cacheTtl: ANIME_CACHE.SUGGESTIONS,
        errorMessage: "Error loading suggestions",
        fetchFn: (sig: AbortSignal) => this.getProvider().getSuggestions(query, { signal: sig }),
        onSuccess: (data: AutocompleteAnime[]) => this.prefetchImages(data.map(item => ({ image: item.poster })))
      },
      signal ?? new AbortController().signal
    );
    return result.data || [];
  }

  async fetchDetailsData(slug: string, signal: AbortSignal, force: boolean): Promise<FetchResult<AnimeDetail | null>> {
    return await this.fetchWithCache(
      {
        cacheKey: createCacheKey(CACHE_PREFIXES.DETAILS, slug),
        cacheTtl: ANIME_CACHE.DETAILS,
        errorMessage: "Error al cargar los detalles",
        fetchFn: (sig: AbortSignal) => this.getProvider().getDetails(slug, { signal: sig }),
        force,
      },
      signal
    );
  }

  async clearAnimeCache(): Promise<void> {
    await Promise.all([
      this.cache.clearWithPrefix(CACHE_PREFIXES.HOME),
      this.cache.clearWithPrefix(`${CACHE_PREFIXES.DETAILS}_`),
      this.cache.clearWithPrefix(`${CACHE_PREFIXES.SEARCH}_`),
      this.cache.clearWithPrefix(`${CACHE_PREFIXES.SUGGESTIONS}_`),
      this.cache.clearWithPrefix(`${CACHE_PREFIXES.STREAM}_`),
    ]);
  }
}

function createNetworkError(message?: string): AppError {
  return { type: "NETWORK_ERROR", message: message || "Sin conexión a internet" };
}

function createGenericError(error: any, fallbackMessage: string): AppError {
  return { type: "UNKNOWN", message: error?.message || fallbackMessage };
}
