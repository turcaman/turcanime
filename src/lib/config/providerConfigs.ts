import type { ProviderConfig } from "../domain/providerConfig";

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {};

export function getProviderConfig(id: string): ProviderConfig | undefined {
  return PROVIDER_CONFIGS[id];
}

export function getAllProviderConfigs(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS);
}
