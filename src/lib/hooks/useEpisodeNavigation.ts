import { getDeps } from "@/lib/di";
import type { Episode, VideoServer } from "@/lib/domain/entities";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useHistoryStore } from "@/lib/store/user";
import type { VideoPlayer } from "expo-video";
import { useCallback, useState } from "react";

export function useEpisodeNavigation(player: VideoPlayer, animeTitle: string, animeImage: string) {
  const { setStream, setLastLanguage, lastLanguage } = usePlayerStore();
  const { addToHistory, lastViewed } = useHistoryStore();
  const deps = getDeps();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEpNumber, setCurrentEpNumber] = useState<string>("");

  const resolveAndPlay = useCallback(async (targetSlug: string, targetEp: Episode) => {
    const prevEpNumber = currentEpNumber;

    const ct = player.currentTime;
    if (ct > 10 && prevEpNumber && prevEpNumber !== targetEp.number) {
      addToHistory({
        title: animeTitle,
        url: targetSlug,
        image: animeImage,
        number: prevEpNumber,
        progress: ct,
        duration: player.duration,
        timestamp: Date.now(),
      }).catch(() => {});
    }

    setLoading(true);
    setError(null);

    const attempt = async (retried: boolean): Promise<void> => {
      const result = await deps.playerService.fetchEpisodeServers(targetSlug, targetEp.number, true);
      if (result.error && result.errorType === "AUTH_ERROR" && !retried) {
        await deps.sessionManager.refreshCookies();
        return attempt(true);
      }
      if (result.error) throw result.error;

      const server: VideoServer | undefined = (
        lastLanguage != null
          ? (result.servers.find((s) => s.language === lastLanguage) ?? result.servers[0])
          : result.servers[0]
      );
      if (server == null) throw new Error("No hay servidor disponible");

      const streamResult = await deps.playerService.resolveStreamUrl(server, targetEp.url);
      if (streamResult.stream == null) throw new Error("No se pudo resolver el stream");

      player.replace({ uri: streamResult.stream.url, headers: streamResult.stream.headers ?? undefined });
      player.play();

      const existing = lastViewed.find(
        (h) => h.url === targetSlug && h.number === targetEp.number,
      );
      if (existing?.progress != null && existing.progress > 10) {
        player.currentTime = existing.progress;
      }

      setCurrentEpNumber(targetEp.number);
      setStream(streamResult.stream.url, streamResult.stream.headers ?? null);
      setLastLanguage(server.language);
      addToHistory({
        title: animeTitle,
        url: targetSlug,
        image: animeImage,
        number: targetEp.number,
        progress: existing?.progress,
        duration: existing?.duration,
        timestamp: Date.now(),
      }).catch(() => {});
    };

    try {
      await attempt(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    }
    setLoading(false);
  }, [deps, setStream, setLastLanguage, lastLanguage, player, addToHistory, lastViewed, animeTitle, animeImage, currentEpNumber]);

  return { resolveAndPlay, loading, error, currentEpNumber, setCurrentEpNumber, setError };
}
