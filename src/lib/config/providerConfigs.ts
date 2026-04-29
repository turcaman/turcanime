import { ProviderConfig } from "../domain/providerConfig";
import { TIMEOUTS } from "./timeouts";

/**
 * AnimeLatinoHD provider configuration
 */
export const ANIMELATINO_CONFIG: ProviderConfig = {
  id: "animelatino",
  name: "AnimeLatinoHD",
  baseUrl: "https://www.animelatinohd.com",
  sessionWashUrl: "https://www.animelatinohd.com/",
  usesJwPlayer: true,
  jwPlayerDelays: [...TIMEOUTS.JWPLAYER_DELAYS],
  endpoints: {
    home: "/",
    popular: "/animes/populares",
    topViewed: "/animes/mas-vistos",
    search: "/animes",
    suggestions: "/api/search",
  },
  features: {
    hasSuggestions: true,
    requiresSession: true,
  },
};

/**
 * Registry of all available provider configurations
 */
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  animelatino: ANIMELATINO_CONFIG,
};

/**
 * Get provider config by ID
 */
export function getProviderConfig(id: string): ProviderConfig | undefined {
  return PROVIDER_CONFIGS[id];
}

/**
 * Get all available provider configs
 */
export function getAllProviderConfigs(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS);
}
