/**
 * Provider configuration interface for multi-provider support.
 * All provider-specific URLs and behaviors should be configured here.
 */

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;

  /** URL to navigate to for session wash (reset cookies/referer) */
  sessionWashUrl: string;

  endpoints?: {
    home?: string;
    popular?: string;
    topViewed?: string;
    search?: string;
    suggestions?: string;
  };

  features?: {
    hasSuggestions: boolean;
    requiresSession: boolean;
  };
}

