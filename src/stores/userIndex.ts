import { create } from "zustand";
import { storage } from "../utils/storage";
import type { HistoryItem } from "../types";
import { useHistoryStore } from "./historyStore";
import { useSearchHistoryStore } from "./searchHistoryStore";
import { useSettingsStore } from "./settingsStore";

const historyKey = "last_viewed";
const searchesKey = "recent_searches";
const EPISODE_ORDER_KEY = "episode_order";

interface InitializationState {
  isInitialized: boolean;
  initialize: () => Promise<void>;
}

export const useUserInitializationStore = create<InitializationState>(() => ({
  isInitialized: false,

  initialize: async () => {
    const [history, searches, order] = await Promise.all([
      storage.get<HistoryItem[]>(historyKey),
      storage.get<string[]>(searchesKey),
      storage.get<"asc" | "desc">(EPISODE_ORDER_KEY),
    ]);

    useHistoryStore.getState().initialize(history ?? []);
    useSearchHistoryStore.getState().initialize(searches ?? []);
    useSettingsStore.getState().initialize(order ?? "asc");

    useUserInitializationStore.setState({ isInitialized: true });
  },

}));

export * from "./historyStore";
export * from "./searchHistoryStore";
export * from "./settingsStore";
