/**
 * Provider configuration interface for multi-provider support.
 * All provider-specific URLs and behaviors should be configured here.
 */

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  sessionWashUrl: string;
  endpoints?: {
    home?: string;
    suggestions?: string;
  };
  features?: {
    hasSuggestions: boolean;
    requiresSession: boolean;
  };
}

