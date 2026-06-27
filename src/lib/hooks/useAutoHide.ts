import { useCallback, useEffect, useRef } from "react";

export function useAutoHide(
  visible: boolean,
  isPlaying: boolean,
  timeoutMs = 3000,
  onHide?: () => void,
) {
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  const clearTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = undefined;
    }
  }, []);

  const restartTimer = useCallback(() => {
    clearTimer();
    if (isPlaying && visible) {
      hideTimer.current = setTimeout(() => { onHideRef.current?.(); }, timeoutMs);
    }
  }, [clearTimer, isPlaying, visible, timeoutMs]);

  useEffect(() => {
    if (visible && isPlaying) {
      clearTimer();
      hideTimer.current = setTimeout(() => { onHideRef.current?.(); }, timeoutMs);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [visible, isPlaying, clearTimer, timeoutMs]);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return { restartTimer, clearTimer };
}
