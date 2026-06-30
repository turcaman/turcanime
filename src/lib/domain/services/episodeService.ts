import type { Episode } from "../entities";

export interface EpisodeRange {
  label: string;
  start: number;
  end: number;
}

/**
 * Sort episodes numerically by episode number.
 * Returns a new sorted array (non-mutating).
 */
export function orderEpisodes(episodes: Episode[]): Episode[] {
  return [...episodes].sort((a, b) => {
    const na = Number(a.number) || 0;
    const nb = Number(b.number) || 0;
    return na - nb;
  });
}

/**
 * Build pagination ranges of up to 50 episodes each.
 * Always operates on ascending-ordered episodes.
 */
export function buildRanges(episodes: Episode[]): EpisodeRange[] {
  if (!episodes.length) return [];
  if (episodes.length <= 50) {
    return [{
      label: `1-${episodes[episodes.length - 1]!.number}`,
      start: 0,
      end: episodes.length,
    }];
  }
  return Array.from({ length: Math.ceil(episodes.length / 50) }, (_, i) => {
    const start = i * 50;
    const end = Math.min(start + 50, episodes.length);
    return {
      label: `${episodes[start]!.number}-${episodes[end - 1]!.number}`,
      start,
      end,
    };
  });
}

/**
 * Return the visible episode slice for a given range index, optionally reversed.
 */
export function getVisibleEpisodes(
  episodes: Episode[],
  ranges: EpisodeRange[],
  activeRangeIdx: number,
  ascending: boolean,
): Episode[] {
  const range = ranges[activeRangeIdx] as EpisodeRange | undefined;
  if (range == null) return [];
  const slice = episodes.slice(range.start, range.end);
  return ascending ? slice : [...slice].reverse();
}

/** Pure computation — not a hook. Returns paginated view of episodes. */
export function computeEpisodePagination(
  episodes: Episode[] | undefined,
  order: "asc" | "desc",
  activeRangeIdx: number,
): { ranges: EpisodeRange[]; visibleEpisodes: Episode[] } {
  const ordered = episodes != null && episodes.length > 0 ? orderEpisodes(episodes) : [];
  const ranges = buildRanges(ordered);
  const visibleEpisodes = getVisibleEpisodes(ordered, ranges, activeRangeIdx, order === "asc");
  return { ranges, visibleEpisodes };
}
