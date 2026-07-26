import { create } from "zustand";

interface InitializationState {
  isInitialized: boolean;
}

export const useUserInitializationStore = create<InitializationState>(() => ({
  isInitialized: false,
}));
