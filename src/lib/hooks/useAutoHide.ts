import { useCallback, useEffect, useRef } from "react";

export function useAutoHide(
  visible: boolean,
  isPlaying: boolean,
  timeoutMs = 3000,
  onHide?: () => void,
) {
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = undefined;
    }
  }, []);

  const restartTimer = useCallback(() => {
    clearTimer();
    if (isPlaying && visible) {
      hideTimer.current = setTimeout(() => { onHide?.(); }, timeoutMs);
    }
  }, [clearTimer, isPlaying, visible, timeoutMs, onHide]);

  useEffect(() => {
    if (visible && isPlaying) {
      clearTimer();
      hideTimer.current = setTimeout(() => { onHide?.(); }, timeoutMs);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [visible, isPlaying, clearTimer, timeoutMs, onHide]);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return { restartTimer, clearTimer };
}
