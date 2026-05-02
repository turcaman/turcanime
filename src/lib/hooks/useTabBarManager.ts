import { useCallback } from "react";
import { useUIStore } from "../store/uiStore";

export interface TabBarOptions {
  threshold?: number;
  autoReset?: boolean;
}

export const useTabBarManager = (options: TabBarOptions = {}) => {
  const { threshold = 8, autoReset = true } = options;
  const setTabBarVisible = useUIStore((state) => state.setTabBarVisible);

  const handleScroll = useCallback((event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const isScrollingDown = currentOffset > threshold;
    setTabBarVisible(!isScrollingDown);
  }, [threshold, setTabBarVisible]);

  const reset = useCallback(() => {
    if (autoReset) {
      setTabBarVisible(true);
    }
  }, [autoReset, setTabBarVisible]);

  const showTabBar = useCallback(() => {
    setTabBarVisible(true);
  }, [setTabBarVisible]);

  const hideTabBar = useCallback(() => {
    setTabBarVisible(false);
  }, [setTabBarVisible]);

  return {
    handleScroll,
    reset,
    showTabBar,
    hideTabBar,
  };
};
