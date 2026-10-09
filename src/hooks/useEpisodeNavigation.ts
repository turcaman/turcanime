import { useCallback, useRef, useState } from "react";
import type { VideoPlayer } from "expo-video";
import { usePlayerStore } from "../stores/playerStore";
import { useHistoryStore } from "../stores/historyStore";
import { findHistoryEntry, makeHistoryEntry, addToHistorySafe } from "../utils/history";

export function useEpisodeNavigation(player: VideoPlayer, animeTitle: string, animeImage: string) {
  const lastLanguage = usePlayerStore((s) => s.lastLanguage);
  const addToHistory = useHistoryStore((s) => s.addToHistory);

  const [loading, setLoading] = useState(false);
  const [currentEpNumber, setCurrentEpNumber] = useState<string>("");
  const attemptRef = useRef(0);

  const resolveAndPlay = useCallback(
    async (targetSlug: string, targetEp: { number: string }) => {
      const attemptId = ++attemptRef.current;
      const prevEpNumber = currentEpNumber;

      const ct = player.currentTime;
      if (ct > 10 && prevEpNumber && prevEpNumber !== targetEp.number) {
        addToHistorySafe(addToHistory, makeHistoryEntry({
          title: animeTitle,
          url: targetSlug,
          image: animeImage,
          number: prevEpNumber,
          progress: ct,
          duration: player.duration,
        }));
      }

      setLoading(true);
      const store = usePlayerStore.getState();
      try {
        // Each store operation owns its own auth ladder; this only sequences
        // them and surfaces orchestrator failures into the stream resource
        const serversOutcome = await store.fetchServers(targetSlug, targetEp.number);
        if (serversOutcome.status === "cancelled") return;
        if (serversOutcome.status === "error") {
          store.failStream(serversOutcome.error);
          return;
        }

        const servers = serversOutcome.data;
        const server =
          lastLanguage != null
            ? servers.find((s) => s.language === lastLanguage) ?? servers[0]
            : servers[0];
        if (server == null) {
          store.failStream({ type: "UNKNOWN", message: "No hay servidor disponible" });
          return;
        }

        const streamOutcome = await store.resolveStream(server);
        if (streamOutcome.status !== "success") return;

        const existing = findHistoryEntry(useHistoryStore.getState().lastViewed, targetSlug, targetEp.number);
        setCurrentEpNumber(targetEp.number);
        addToHistorySafe(addToHistory, makeHistoryEntry({
          title: animeTitle,
          url: targetSlug,
          image: animeImage,
          number: targetEp.number,
          progress: existing?.progress,
          duration: existing?.duration,
        }));
      } finally {
        // A superseded attempt must not clear the newer attempt's spinner
        if (attemptRef.current === attemptId) setLoading(false);
      }
    },
    [lastLanguage, player, addToHistory, animeTitle, animeImage, currentEpNumber],
  );

  return { resolveAndPlay, loading, currentEpNumber, setCurrentEpNumber };
}