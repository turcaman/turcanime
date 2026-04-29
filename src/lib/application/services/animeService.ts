import { ANIME_CACHE } from "../../config/cacheTTLs";
import { TIMEOUTS } from "../../config/timeouts";
import { getDeps } from "../../di";
import { Anime, AnimeDetail, AppError, AutocompleteAnime, HomeData } from "../../domain/entities";
import { CacheRepo } from "../../domain/repositories/cacheRepo";

const cache = CacheRepo.getInstance(getDeps().storage);

const HOME_CACHE_KEY = "ch_home";
const searchKey = (q: string) => `search_${q.toLowerCase().trim()}`;
const suggestKey = (q: string) => `suggestions_${q.toLowerCase().trim()}`;
const detailsKey = (s: string) => `anime_${s}`;

interface FetchResult<T> {
  data: T | null;
  error: AppError | null;
  fromCache: boolean;
}

interface FetchOptions<T> {
  cacheKey: string;
  cacheTtl: number;
  errorMessage: string;
  fetchFn: (signal: AbortSignal) => Promise<T>;
  force?: boolean;
  onSuccess?: (data: T) => void;
}

async function checkCache<T>(cacheKey: string, force: boolean): Promise<T | null> {
  if (force) return null;
  return await cache.get<T>(cacheKey);
}

async function handleAuthError<T>(
  cacheKey: string,
  fetchFn: (signal: AbortSignal) => Promise<T>,
  cacheTtl: number,
  onSuccess?: (data: T) => void
): Promise<FetchResult<T>> {
  await cache.clearWithPrefix(cacheKey);
  await getDeps().sessionManager.invalidateCookies();

  const retryController = new AbortController();
  try {
    const data = await fetchFn(retryController.signal);
    await cache.set(cacheKey, data, cacheTtl);
    onSuccess?.(data);
    return { data, error: null, fromCache: false };
  } catch {
    return {
      data: null,
      error: { type: "AUTH_ERROR", message: "Error al recuperar sesión. Intenta recargar." },
      fromCache: false,
    };
  }
}

function createNetworkError(message?: string): AppError {
  return { type: "NETWORK_ERROR", message: message || "Sin conexión a internet" };
}

function createGenericError(err: { type?: string; message?: string }, defaultMessage: string): AppError {
  return {
    type: err.type === "SERVER_ERROR" || err.type === "NOT_FOUND" ? err.type : "UNKNOWN",
    message: err.message || defaultMessage,
  };
}

async function fetchWithCache<T>(options: FetchOptions<T>, signal: AbortSignal): Promise<FetchResult<T>> {
  const { cacheKey, cacheTtl, errorMessage, fetchFn, force, onSuccess } = options;

  const cached = await checkCache<T>(cacheKey, force || false);
  if (cached) {
    return { data: cached, error: null, fromCache: true };
  }

  try {
    const data = await fetchFn(signal);
    await cache.set(cacheKey, data, cacheTtl);
    onSuccess?.(data);
    return { data, error: null, fromCache: false };
  } catch (e: unknown) {
    const err = e as { name?: string; type?: string; message?: string };

    if (err.name === "AbortError") {
      return { data: null, error: null, fromCache: false };
    }

    if (err.type === "AUTH_ERROR") {
      return await handleAuthError(cacheKey, fetchFn, cacheTtl, onSuccess);
    }

    if (err.type === "NETWORK_ERROR") {
      return { data: null, error: createNetworkError(err.message), fromCache: false };
    }

    return { data: null, error: createGenericError(err, errorMessage), fromCache: false };
  }
}

export async function fetchHomeData(signal: AbortSignal, force: boolean): Promise<FetchResult<HomeData>> {
  return await fetchWithCache(
    {
      cacheKey: HOME_CACHE_KEY,
      cacheTtl: ANIME_CACHE.HOME,
      errorMessage: "Error al cargar la pantalla de inicio",
      fetchFn: (sig: AbortSignal) => getDeps().getProvider().getHomeData({ signal: sig }),
      force,
    },
    signal
  );
}

export async function fetchSearchData(query: string, signal: AbortSignal, force: boolean): Promise<FetchResult<Anime[]>> {
  if (!query?.trim()) {
    return { data: [], error: null, fromCache: false };
  }

  const SEARCH_TIMEOUT = TIMEOUTS.SEARCH;

  return await fetchWithCache(
    {
      cacheKey: searchKey(query),
      cacheTtl: ANIME_CACHE.SEARCH,
      errorMessage: "Error searching anime",
      fetchFn: async (sig: AbortSignal) => {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Search timeout")), SEARCH_TIMEOUT);
        });
        const searchPromise = getDeps().getProvider().search(query, { signal: sig });
        return await Promise.race([searchPromise, timeoutPromise]);
      },
      force,
    },
    signal
  );
}

export async function fetchSuggestionsData(query: string): Promise<AutocompleteAnime[]> {
  if (!query || query.length < 3) {
    return [];
  }
  const cKey = suggestKey(query);

  const cached = await cache.get<AutocompleteAnime[]>(cKey);
  if (cached) {
    return cached;
  }

  try {
    const data = await getDeps().getProvider().getSuggestions(query);
    await cache.set(cKey, data, ANIME_CACHE.SUGGESTIONS);
    return data;
  } catch {
    return [];
  }
}

export async function fetchDetailsData(slug: string, signal: AbortSignal, force: boolean): Promise<FetchResult<AnimeDetail | null>> {
  return await fetchWithCache(
    {
      cacheKey: detailsKey(slug),
      cacheTtl: ANIME_CACHE.DETAILS,
      errorMessage: "Error al cargar los detalles",
      fetchFn: (sig: AbortSignal) => getDeps().getProvider().getDetails(slug, { signal: sig }),
      force,
    },
    signal
  );
}

export async function clearAnimeCache(): Promise<void> {
  await Promise.all([
    cache.clearWithPrefix("ch_home"),
    cache.clearWithPrefix("anime_"),
    cache.clearWithPrefix("search_"),
    cache.clearWithPrefix("suggestions_"),
  ]);
}
