/**
 * Provider configuration interface for multi-provider support.
 * All provider-specific URLs and behaviors should be configured here.
 */

export interface ProviderConfig {
  /** Unique identifier for the provider */
  id: string;

  /** Display name for the provider */
  name: string;

  /** Base URL for the provider */
  baseUrl: string;

  /** URL to navigate to for session wash (reset cookies/referer) */
  sessionWashUrl: string;

  /** Optional: Custom endpoints for this provider */
  endpoints?: {
    home?: string;
    popular?: string;
    topViewed?: string;
    search?: string;
    suggestions?: string;
  };

  /** Optional: Provider-specific features */
  features?: {
    /** Whether this provider supports autocomplete/suggestions */
    hasSuggestions: boolean;
    /** Whether this provider requires session management */
    requiresSession: boolean;
  };
}

export interface ProviderMetadata {
  config: ProviderConfig;
  /** Health check endpoint URL */
  healthCheckUrl?: string;
  /** Last known health status */
  isHealthy?: boolean;
  /** Last health check timestamp */
  lastHealthCheck?: number;
}
