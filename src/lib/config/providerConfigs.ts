import type { ProviderConfig } from "../domain/providerConfig";

/**
 * Registry of all available provider configurations.
 * Add new provider configs here when creating a new content provider.
 */
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {};

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
