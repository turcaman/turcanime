import { useState } from "react";
import type { Episode } from "../types";

export function useEpisodeUI() {
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  return {
    selectedEpisode,
    setSelectedEpisode,
    isExpanded,
    setIsExpanded,
    selectEpisode: (episode: Episode) => setSelectedEpisode(episode),
    closeModal: () => setSelectedEpisode(null),
  };
}
