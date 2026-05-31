import { useCallback, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useUIStore } from "../store/uiStore";

export interface TabBarOptions {
  threshold?: number;
  autoReset?: boolean;
}

export const useTabBarManager = (options: TabBarOptions = {}) => {
  const { threshold = 8, autoReset = true } = options;
  const setTabBarVisible = useUIStore((state) => state.setTabBarVisible);
  const scrollYRef = useRef(0);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const previousY = scrollYRef.current;
    const delta = currentY - previousY;

    // Only process if scroll delta exceeds threshold
    if (Math.abs(delta) > threshold) {
      const isScrollingDown = delta > 0;
      setTabBarVisible(!isScrollingDown);
    }

    scrollYRef.current = currentY;
  }, [threshold, setTabBarVisible]);

  const reset = useCallback(() => {
    scrollYRef.current = 0;
    if (autoReset) {
      setTabBarVisible(true);
    }
  }, [autoReset, setTabBarVisible]);

  const showTabBar = useCallback(() => {
    setTabBarVisible(true);
  }, [setTabBarVisible]);

  return {
    handleScroll,
    reset,
    showTabBar,
  };
};
