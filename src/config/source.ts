export const ACCENT_COLOR = "#A855F7";
export const MUTED_ICON = "#737373";

export const SOURCE_CONFIG = {
  baseUrl: "https://www.animelatinohd.com",
  get sessionWashUrl() { return SOURCE_CONFIG.baseUrl + "/"; },
  homeEndpoint: "/directorio",
};

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w300";
export const TMDB_POSTER_W92 = "https://media.themoviedb.org/t/p/w92";

export const LANGUAGE_MAP: Record<string, string> = {
  SUB: "Subtitulado",
  LAT: "Latino",
  ESP: "Castellano",
};
