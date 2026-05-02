/**
 * Provider registry — manages the active IContentProvider singleton.
 *
 * Currently supports only one provider (AnimeLatinoProvider).
 * To add a new provider in the future:
 * 1. Create a class implementing IContentProvider
 * 2. Update createProvider to instantiate the new provider
 */
import { IContentProvider } from "../domain/interfaces";
import { CacheRepo } from "../domain/repositories/cacheRepo";
import "../infrastructure/providers/AnimeLatinoProvider";
import { sessionManager, storage } from "./infrastructure";
import { createProvider } from "./providerFactory";

let currentProvider: IContentProvider | null = null;

export const getProvider = (): IContentProvider => {
  if (!currentProvider) {
    const cacheRepo = new CacheRepo(storage);
    currentProvider = createProvider("safe", sessionManager, cacheRepo);
  }
  return currentProvider;
};

export const initProvider = () => {
  const cacheRepo = new CacheRepo(storage);
  currentProvider = createProvider("safe", sessionManager, cacheRepo);
};
