import type { HistoryItem } from "../types";
import { logger } from "./logger";

export async function persistWithRollback(
  persist: () => Promise<void>,
  rollback: () => void,
  tag: string,
): Promise<void> {
  try {
    await persist();
  } catch (error) {
    rollback();
    logger.error(tag, "Failed to persist", error);
  }
}

export function prependDedup<T>(list: T[], item: T, max: number, dedupKey?: keyof T): T[] {
  const filtered = dedupKey != null
    ? list.filter(i => i[dedupKey] !== item[dedupKey])
    : list.filter(i => i !== item);
  return [item, ...filtered].slice(0, max);
}

export function removeBy<T>(list: T[], predicate: (item: T) => boolean): T[] {
  return list.filter(predicate);
}

export function makeHistoryEntry(params: {
  title: string; image: string; url: string; number: string;
  progress?: number | null; duration?: number | null;
}): HistoryItem {
  return {
    title: params.title, image: params.image, url: params.url,
    number: params.number, progress: params.progress ?? undefined,
    duration: params.duration ?? undefined, timestamp: Date.now(),
  };
}

export function addToHistorySafe(
  addToHistoryFn: (item: HistoryItem) => Promise<void>,
  item: HistoryItem,
): void {
  void addToHistoryFn(item).catch(() => {});
}

export function findHistoryEntry(lastViewed: HistoryItem[], url: string, number: string): HistoryItem | undefined {
  return lastViewed.find((h) => h.url === url && h.number === number);
}

export function computeContinueWatching(lastViewed: HistoryItem[]): HistoryItem[] {
  const latestPerAnime = new Map<string, HistoryItem>();
  for (const item of lastViewed) {
    const existing = latestPerAnime.get(item.url);
    if (!existing || item.timestamp > existing.timestamp) {
      latestPerAnime.set(item.url, item);
    }
  }
  return Array.from(latestPerAnime.values()).slice(0, 8);
}
