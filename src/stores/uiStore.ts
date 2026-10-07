import { create } from "zustand";

interface UIState {
  tabBarVisible: boolean;
  isRefreshingSession: boolean;
  sessionRefreshTrigger: number;
  sessionRefreshSource: string | null;
  sessionRefreshFailed: boolean;
  setTabBarVisible: (visible: boolean) => void;
  triggerSessionRefresh: (source: string) => void;
  setSessionRefreshing: (refreshing: boolean) => void;
  setSessionRefreshFailed: (failed: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  tabBarVisible: true,
  isRefreshingSession: false,
  sessionRefreshTrigger: 0,
  sessionRefreshSource: null,
  sessionRefreshFailed: false,

  setTabBarVisible: (visible) => set({ tabBarVisible: visible }),

  triggerSessionRefresh: (source: string) => {
    const state = get();
    if (state.isRefreshingSession) return;
    set({ sessionRefreshTrigger: Date.now(), sessionRefreshSource: source, isRefreshingSession: true });
  },

  setSessionRefreshing: (refreshing) => set({ isRefreshingSession: refreshing }),
  setSessionRefreshFailed: (failed) => set({ sessionRefreshFailed: failed }),
}));
