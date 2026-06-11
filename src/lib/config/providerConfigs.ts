import type { ProviderConfig } from "../domain/providerConfig";

/**
 * Registry of all available provider configurations.
 * Add new provider configs here when creating a new content provider.
 */
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {};

export const KATANIME_CONFIG: ProviderConfig = {
  id: "katanime",
  name: "Katanime",
  baseUrl: "https://katanime.net",
  sessionWashUrl: "about:blank",
  endpoints: {
    home: "/animes?fecha=CURRENT_YEAR&p=1",
    popular: "/populares",
    search: "/buscar?q=QUERY&p=1",
  },
  features: {
    hasSuggestions: false,
    requiresSession: false,
  },
};

PROVIDER_CONFIGS["katanime"] = KATANIME_CONFIG;

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
