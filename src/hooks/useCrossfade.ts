import { useEffect, useRef, useState } from "react";
import { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const DEFAULT_DURATION = 250;

export function useCrossfade(visible: boolean, duration = DEFAULT_DURATION) {
  const [keepSkeleton, setKeepSkeleton] = useState(!visible);
  const skeletonOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(visible ? 1 : 0);
  const wasHidden = useRef(!visible);

  useEffect(() => {
    if (!visible) {
      skeletonOpacity.value = 1;
      contentOpacity.value = 0;
      setKeepSkeleton(true);
      wasHidden.current = true;
      return;
    }
    if (wasHidden.current) {
      wasHidden.current = false;
      skeletonOpacity.value = withTiming(0, { duration });
      contentOpacity.value = withTiming(1, { duration }, (finished) => {
        if (finished) runOnJS(setKeepSkeleton)(false);
      });
    }
  }, [visible, duration, skeletonOpacity, contentOpacity]);

  const skeletonStyle = useAnimatedStyle(() => ({ opacity: skeletonOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  return { keepSkeleton, skeletonStyle, contentStyle };
}
