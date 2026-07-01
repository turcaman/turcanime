import { useCallback, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useUIStore } from "../stores/uiStore";

export const useTabBarManager = (options: { threshold?: number; autoReset?: boolean } = {}) => {
  const { threshold = 8, autoReset = true } = options;
  const setTabBarVisible = useUIStore((state) => state.setTabBarVisible);
  const scrollYRef = useRef(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const previousY = scrollYRef.current;
      const delta = currentY - previousY;

      if (Math.abs(delta) > threshold) {
        setTabBarVisible(!(delta > 0));
      }
      scrollYRef.current = currentY;
    },
    [threshold, setTabBarVisible],
  );

  const reset = useCallback(() => {
    scrollYRef.current = 0;
    if (autoReset) setTabBarVisible(true);
  }, [autoReset, setTabBarVisible]);

  return { handleScroll, reset, showTabBar: useCallback(() => setTabBarVisible(true), [setTabBarVisible]) };
};
