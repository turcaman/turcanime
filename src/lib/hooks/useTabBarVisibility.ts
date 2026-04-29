import { useEffect } from "react";
import { useUIStore } from "../store/uiStore";
import { useScrollDirection } from "./useScrollDirection";

interface UseTabBarVisibilityOptions {
  threshold?: number;
}

export function useTabBarVisibility(options: UseTabBarVisibilityOptions = {}) {
  const { threshold = 8 } = options;
  const { direction, isAtTop, handleScroll, reset } = useScrollDirection({ threshold });
  const setTabBarVisible = useUIStore((state) => state.setTabBarVisible);

  // Sync tab bar visibility with scroll direction
  useEffect(() => {
    const visible = direction !== "down" || isAtTop;
    setTabBarVisible(visible);
  }, [direction, isAtTop, setTabBarVisible]);

  return {
    direction,
    isAtTop,
    handleScroll,
    reset,
  };
}
