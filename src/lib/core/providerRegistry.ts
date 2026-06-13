import type { IContentProvider } from "../domain/interfaces";

let currentProvider: IContentProvider | null = null;

export const getProvider = (): IContentProvider | null => {
  return currentProvider;
};

export const setProvider = (provider: IContentProvider): void => {
  currentProvider = provider;
};
