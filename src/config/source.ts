/** Source configuration */
export const SOURCE_CONFIG = {
  name: "AnimeLatinoHD",
  baseUrl: "https://www.animelatinohd.com",
  sessionWashUrl: "https://www.animelatinohd.com/",
  endpoints: {
    home: "/directorio",
    suggestions: "/api/search",
  },
  features: {
    hasSuggestions: true,
    requiresSession: true,
  },
};

/** TMDB image base URLs */
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w300";
export const TMDB_POSTER_W92 = "https://media.themoviedb.org/t/p/w92";

/** Embed server referer map — used by the player to set proper headers */
export const EMBED_REFERER: ReadonlyMap<string, string> = new Map([
  ["yourupload.com", "https://www.yourupload.com/"],
  ["voe.sx", "https://voe.sx/"],
  ["hqq.tv", "https://hqq.tv/"],
  ["vgfplay.com", "https://vgfplay.com/"],
  ["vidguard", "https://vgfplay.com/"],
  ["vidcache.net", "https://www.yourupload.com/"],
]);

/** Find the required Referer for a given video URL */
export function refererForUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    for (const [domain, referer] of EMBED_REFERER) {
      if (hostname.includes(domain)) return referer;
    }
  } catch {
  }
  return "";
}
