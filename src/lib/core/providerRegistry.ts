import type { IContentProvider } from "../domain/interfaces";

let currentProvider: IContentProvider | null = null;

export const getProvider = (): IContentProvider => {
  if (!currentProvider) {
    throw new Error("Provider not initialized. Call setProvider first.");
  }
  return currentProvider;
};

export const setProvider = (provider: IContentProvider): void => {
  currentProvider = provider;
};
