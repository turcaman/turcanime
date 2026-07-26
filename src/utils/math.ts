export function calcProgress(progress?: number | null, duration?: number | null): number {
  if (progress != null && duration != null && duration > 0) {
    return Math.min(progress / duration, 1);
  }
  return 0;
}
