import type { ProviderConfig } from "../domain/providerConfig";

/** AnimeLatinoHD provider configuration */
export const ANIMELATINO_CONFIG: ProviderConfig = {
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


