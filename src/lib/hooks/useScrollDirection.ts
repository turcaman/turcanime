import { useCallback, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

type ScrollDirection = "up" | "down" | null;

interface UseScrollDirectionOptions {
  threshold?: number;
}

export function useScrollDirection(options: UseScrollDirectionOptions = {}) {
  const { threshold = 50 } = options;
  const [direction, setDirection] = useState<ScrollDirection>(null);
  const [isAtTop, setIsAtTop] = useState(true);

  const scrollYRef = useRef(0);
  const lastDirectionRef = useRef<ScrollDirection>(null);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const previousY = scrollYRef.current;
      const delta = currentY - previousY;

      setIsAtTop(currentY < 10);

      if (Math.abs(delta) > threshold) {
        const newDirection: ScrollDirection = delta > 0 ? "down" : "up";

        if (newDirection !== lastDirectionRef.current) {
          setDirection(newDirection);
          lastDirectionRef.current = newDirection;
        }
      }

      scrollYRef.current = currentY;
    },
    [threshold]
  );

  const reset = useCallback(() => {
    scrollYRef.current = 0;
    lastDirectionRef.current = null;
    setDirection(null);
    setIsAtTop(true);
  }, []);

  return {
    direction,
    isAtTop,
    isVisible: direction !== "down" || isAtTop,
    handleScroll,
    reset,
  };
}
