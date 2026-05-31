import { useState } from "react";
import type { Episode } from "../domain/entities";

interface UseEpisodeUIResult {
  selectedEpisode: Episode | null;
  setSelectedEpisode: (episode: Episode | null) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  selectEpisode: (episode: Episode) => void;
  closeModal: () => void;
}

export function useEpisodeUI(): UseEpisodeUIResult {
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const selectEpisode = (episode: Episode) => {
    setSelectedEpisode(episode);
  };

  const closeModal = () => {
    setSelectedEpisode(null);
  };

  return {
    selectedEpisode,
    setSelectedEpisode,
    isExpanded,
    setIsExpanded,
    selectEpisode,
    closeModal,
  };
}
