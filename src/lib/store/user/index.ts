import { create } from "zustand";
import { getDeps } from "../../di";
import { useHistoryStore } from "./historyStore";
import { useSearchHistoryStore } from "./searchHistoryStore";
import { useSettingsStore } from "./settingsStore";
import { HistoryItem } from "../../domain/entities";

const historyKey = "last_viewed";
const searchesKey = "recent_searches";
const EPISODE_ORDER_KEY = "episode_order";

interface InitializationState {
  isInitialized: boolean;
  initialize: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const useUserInitializationStore = create<InitializationState>(() => ({
  isInitialized: false,
  
  initialize: async () => {
    const history = await getDeps().storage.get<HistoryItem[]>(historyKey);
    const searches = await getDeps().storage.get<string[]>(searchesKey);
    const order = await getDeps().storage.get<"asc" | "desc">(EPISODE_ORDER_KEY);
    
    useHistoryStore.getState().initialize(history || []);
    useSearchHistoryStore.getState().initialize(searches || []);
    useSettingsStore.getState().initialize(order || "asc");
    
    useUserInitializationStore.setState({ isInitialized: true });
  },
  
  clearAllData: async () => {
    useHistoryStore.getState().clearHistory();
    useSearchHistoryStore.getState().clearRecentSearches();
    useSettingsStore.getState().setEpisodeOrder("asc");
    await getDeps().storage.clear();
  }
}));

export * from "./historyStore";
export * from "./searchHistoryStore";
export * from "./settingsStore";
