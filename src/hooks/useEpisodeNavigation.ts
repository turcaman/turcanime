import { useCallback, useState } from "react";
import type { VideoPlayer } from "expo-video";
import type { Episode, VideoServer } from "../types";
import { usePlayerStore } from "../stores/playerStore";
import { useHistoryStore } from "../stores/historyStore";
import { source } from "../services/source";
import { refreshSession } from "../services/session";
import { isAuthError } from "../utils/errors";
import { findHistoryEntry, makeHistoryEntry, addToHistorySafe } from "../utils/history";

export function useEpisodeNavigation(player: VideoPlayer, animeTitle: string, animeImage: string) {
  const { setStream, setLastLanguage, lastLanguage } = usePlayerStore();
  const { addToHistory } = useHistoryStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEpNumber, setCurrentEpNumber] = useState<string>("");

  const resolveAndPlay = useCallback(
    async (targetSlug: string, targetEp: Episode) => {
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
      setError(null);

      const attempt = async (_retried?: boolean): Promise<void> => {
        const servers = await source.getEpisodeServers(targetSlug, targetEp.number);
        const server: VideoServer | undefined =
          lastLanguage != null
            ? servers.find((s) => s.language === lastLanguage) ?? servers[0]
            : servers[0];
        if (server == null) throw new Error("No hay servidor disponible");

        const streamResult = await source.resolveStreamUrl(server.url);
        if (streamResult == null) throw new Error("No se pudo resolver el stream");

        const headers = streamResult.headers;

        const existing = findHistoryEntry(useHistoryStore.getState().lastViewed, targetSlug, targetEp.number);

        setCurrentEpNumber(targetEp.number);
        setStream(streamResult.url, headers ?? null);
        setLastLanguage(server.language);
        addToHistorySafe(addToHistory, makeHistoryEntry({
          title: animeTitle,
          url: targetSlug,
          image: animeImage,
          number: targetEp.number,
          progress: existing?.progress,
          duration: existing?.duration,
        }));
      };

      try {
        await attempt();
      } catch (e: unknown) {
        if (isAuthError(e)) {
          try {
            await refreshSession();
          } catch {
            setError("Error al renovar sesión");
            setLoading(false);
            return;
          }
          try {
            await attempt(true);
          } catch (e2: unknown) {
            setError(e2 instanceof Error ? e2.message : "Error desconocido");
          }
        } else {
          setError(e instanceof Error ? e.message : "Error desconocido");
        }
      }
      setLoading(false);
    },
    [setStream, setLastLanguage, lastLanguage, player, addToHistory, animeTitle, animeImage, currentEpNumber],
  );

  return { resolveAndPlay, loading, error, currentEpNumber, setCurrentEpNumber, setError };
}
