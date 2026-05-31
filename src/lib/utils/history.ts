import type { HistoryItem } from "../domain/entities";

export function prependDedup<T>(list: T[], item: T, max: number, dedupKey?: keyof T): T[] {
  const filtered = dedupKey
    ? list.filter(i => i[dedupKey] !== item[dedupKey])
    : list.filter(i => i !== item);
  return [item, ...filtered].slice(0, max);
}

export function removeBy<T>(list: T[], predicate: (item: T) => boolean): T[] {
  return list.filter(predicate);
}

export function computeContinueWatching(lastViewed: HistoryItem[]): HistoryItem[] {
  const uniqueAnimes = new Map<string, HistoryItem>();
  lastViewed.forEach(item => {
    uniqueAnimes.set(item.url, item);
  });
  return Array.from(uniqueAnimes.values()).slice(0, 8);
}
