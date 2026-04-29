import { getDeps } from "../../di";
import { Anime, AnimeDetail, AppError, AutocompleteAnime, HomeData } from "../../domain/entities";
import { CacheRepo } from "../../domain/repositories/cacheRepo";

interface FetchOptions<T> {
  cacheKey: string;
  cacheTtl: number;
  controllerKey: keyof typeof controllers;
  loadingKey: "isHomeLoading" | "isSearchLoading" | "isDetailsLoading";
  dataKey: keyof AnimeState;
  errorMessage: string;
  fetchFn: (signal: AbortSignal) => Promise<T>;
  force?: boolean;
  onSuccess?: (data: T) => void;
}

interface AnimeState {
  homeData: HomeData;
  searchAnimes: Anime[];
  suggestions: AutocompleteAnime[];
  activeAnime: AnimeDetail | null;
  lastSearchTerm: string;
  error: AppError | null;
  isHomeLoading: boolean;
  isSearchLoading: boolean;
  isDetailsLoading: boolean;
  isSuggestionsLoading: boolean;
}

const controllers = {
  home: new AbortController(),
  search: new AbortController(),
  details: new AbortController(),
};

const createAbort = (key: keyof typeof controllers) => {
  controllers[key].abort();
  return new AbortController();
};

async function checkCache<T>(
  cache: CacheRepo,
  cacheKey: string,
  force: boolean
): Promise<T | null> {
  if (force) return null;
  return await cache.get<T>(cacheKey);
}

function setCachedData<T>(
  set: (fn: (state: AnimeState) => Partial<AnimeState>) => void,
  data: T,
  dataKey: keyof AnimeState,
  loadingKey: keyof AnimeState
): void {
  set((state) => ({
    ...state,
    [dataKey]: data,
    error: null,
    [loadingKey]: false,
  } as Partial<AnimeState>));
}

function setLoading(
  set: (fn: (state: AnimeState) => Partial<AnimeState>) => void,
  loadingKey: keyof AnimeState
): void {
  set((state) => ({
    ...state,
    [loadingKey]: true,
    error: null,
  } as Partial<AnimeState>));
}

function clearLoading(
  set: (fn: (state: AnimeState) => Partial<AnimeState>) => void,
  loadingKey: keyof AnimeState
): void {
  set((state) => ({
    ...state,
    [loadingKey]: false,
  } as Partial<AnimeState>));
}

function setError(
  set: (fn: (state: AnimeState) => Partial<AnimeState>) => void,
  error: AppError,
  loadingKey: keyof AnimeState
): void {
  set((state) => ({
    ...state,
    error,
    [loadingKey]: false,
  } as Partial<AnimeState>));
}

async function handleAuthError<T>(
  fetchFn: (signal: AbortSignal) => Promise<T>,
  cacheKey: string,
  cacheTtl: number,
  cache: CacheRepo,
  set: (fn: (state: AnimeState) => Partial<AnimeState>) => void,
  dataKey: keyof AnimeState,
  loadingKey: keyof AnimeState,
  onSuccess?: (data: T) => void,
  isMounted = true
): Promise<void> {
  await cache.clearWithPrefix(cacheKey);
  await getDeps().sessionManager.invalidateCookies();

  set((state) => ({
    ...state,
    error: { type: "AUTH_ERROR", message: "Sesión inválida, reparando..." },
  }));

  const retryController = new AbortController();
  try {
    const data = await fetchFn(retryController.signal);
    if (isMounted) {
      set((state) => ({
        ...state,
        [dataKey]: data,
        error: null,
        [loadingKey]: false,
      } as Partial<AnimeState>));
      await cache.set(cacheKey, data, cacheTtl);
      onSuccess?.(data);
    }
  } catch (retryError) {
    if (isMounted) {
      setError(
        set,
        {
          type: "AUTH_ERROR",
          message: "Error al recuperar sesión. Intenta recargar.",
        },
        loadingKey
      );
    }
  }
}

function handleNetworkError(
  err: { message?: string },
  set: (fn: (state: AnimeState) => Partial<AnimeState>) => void,
  loadingKey: keyof AnimeState
): void {
  setError(
    set,
    {
      type: "NETWORK_ERROR",
      message: err.message || "Sin conexión a internet",
    },
    loadingKey
  );
}

function handleGenericError(
  err: { type?: string; message?: string },
  errorMessage: string,
  set: (fn: (state: AnimeState) => Partial<AnimeState>) => void,
  loadingKey: keyof AnimeState
): void {
  setError(
    set,
    {
      type:
        err.type === "SERVER_ERROR" || err.type === "NOT_FOUND"
          ? err.type
          : "UNKNOWN",
      message: err.message || errorMessage,
    },
    loadingKey
  );
}

async function executeFetchWithCache<T>(
  set: (fn: (state: AnimeState) => Partial<AnimeState>) => void,
  get: () => AnimeState,
  options: FetchOptions<T>
): Promise<void> {
  const {
    cacheKey,
    cacheTtl,
    controllerKey,
    loadingKey,
    dataKey,
    errorMessage,
    fetchFn,
    force,
    onSuccess,
  } = options;

  const cache = CacheRepo.getInstance(getDeps().storage);
  const controller = createAbort(controllerKey);
  let isMounted = true;

  setLoading(set, loadingKey);

  const cached = await checkCache<T>(cache, cacheKey, force || false);
  if (cached) {
    setCachedData(set, cached, dataKey, loadingKey);
    return;
  }

  try {
    const data = await fetchFn(controller.signal);
    if (isMounted) {
      setCachedData(set, data, dataKey, loadingKey);
      await cache.set(cacheKey, data, cacheTtl);
      onSuccess?.(data);
    }
  } catch (e: unknown) {
    await handleFetchError(
      e,
      set,
      loadingKey,
      dataKey,
      errorMessage,
      fetchFn,
      cacheKey,
      cacheTtl,
      cache,
      onSuccess,
      isMounted
    );
  }
}

async function handleFetchError<T>(
  e: unknown,
  set: (fn: (state: AnimeState) => Partial<AnimeState>) => void,
  loadingKey: keyof AnimeState,
  dataKey: keyof AnimeState,
  errorMessage: string,
  fetchFn: (signal: AbortSignal) => Promise<T>,
  cacheKey: string,
  cacheTtl: number,
  cache: CacheRepo,
  onSuccess?: (data: T) => void,
  isMounted = true
): Promise<void> {
  const err = e as { name?: string; type?: string; message?: string };

  if (err.name === "AbortError") {
    if (isMounted) {
      clearLoading(set, loadingKey);
    }
    return;
  }

  if (!isMounted) return;

  if (err.type === "AUTH_ERROR") {
    await handleAuthError(
      fetchFn,
      cacheKey,
      cacheTtl,
      cache,
      set,
      dataKey,
      loadingKey,
      onSuccess,
      isMounted
    );
    return;
  }

  if (err.type === "NETWORK_ERROR") {
    handleNetworkError(err, set, loadingKey);
    return;
  }

  handleGenericError(err, errorMessage, set, loadingKey);
}

export { controllers, createAbort, executeFetchWithCache };
export type { AnimeState, FetchOptions };

