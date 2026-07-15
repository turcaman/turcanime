import type { HistoryItem } from "../types";

export function prependDedup<T>(list: T[], item: T, max: number, dedupKey?: keyof T): T[] {
  const filtered = dedupKey != null
    ? list.filter(i => i[dedupKey] !== item[dedupKey])
    : list.filter(i => i !== item);
  return [item, ...filtered].slice(0, max);
}

export function removeBy<T>(list: T[], predicate: (item: T) => boolean): T[] {
  return list.filter(predicate);
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
