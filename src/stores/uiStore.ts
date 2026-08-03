import { create } from "zustand";

interface UIState {
  tabBarVisible: boolean;
  isRefreshingSession: boolean;
  sessionRefreshTrigger: number;
  sessionRefreshFailed: boolean;
  setTabBarVisible: (visible: boolean) => void;
  triggerSessionRefresh: () => void;
  setSessionRefreshing: (refreshing: boolean) => void;
  setSessionRefreshFailed: (failed: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  tabBarVisible: true,
  isRefreshingSession: false,
  sessionRefreshTrigger: 0,
  sessionRefreshFailed: false,

  setTabBarVisible: (visible) => set({ tabBarVisible: visible }),

  triggerSessionRefresh: () => {
    const state = get();
    if (state.isRefreshingSession) return;
    set({ sessionRefreshTrigger: Date.now(), isRefreshingSession: true });
  },

  setSessionRefreshing: (refreshing) => set({ isRefreshingSession: refreshing }),
  setSessionRefreshFailed: (failed) => set({ sessionRefreshFailed: failed }),
}));
