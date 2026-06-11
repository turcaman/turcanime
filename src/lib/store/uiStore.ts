import { create } from "zustand";

interface UIState {
  tabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  tabBarVisible: true,
  setTabBarVisible: (visible) => { set({ tabBarVisible: visible }); },
}));
