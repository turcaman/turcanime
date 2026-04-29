/**
 * Provider registry — manages the active IContentProvider lifecycle.
 * Delegates instantiation to ProviderFactory (Open/Closed Principle).
 *
 * To add a new provider:
 * 1. Create a class implementing IContentProvider
 * 2. Call registerProvider("provider_id", YourProvider) at the bottom of its file
 * 3. Call initProviderForMode("provider_id") where appropriate
 */
import { IContentProvider } from "../domain/interfaces";
import "../infrastructure/providers/AnimeLatinoProvider";
import { sessionManager } from "./infrastructure";
import { createProvider, hasProvider } from "./providerFactory";

// Re-export factory functions so providers can register without importing the factory directly
export { createProvider, getRegisteredModes, hasProvider, registerProvider } from "./providerFactory";

// TODO: Make this provider-agnostic - auto-discover and register providers from config

let currentProvider: IContentProvider | null = null;

export const getProvider = (): IContentProvider => {
  if (!currentProvider) {
    currentProvider = createProvider("safe", sessionManager);
  }
  return currentProvider;
};

export const setProvider = (provider: IContentProvider) => {
  currentProvider = provider;
};

/**
 * Instantiate and set the correct provider for the given id.
 * Throws if no provider is registered for the requested id.
 */
export const initProviderForMode = (id: string) => {
  if (!hasProvider(id)) {
    throw new Error(`Cannot init provider for id "${id}": not registered`);
  }
  setProvider(createProvider(id, sessionManager));
};
