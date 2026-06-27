import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlayerControls } from "@/components/PlayerControls";
import { orderEpisodes } from "@/lib/domain/services/episodeService";
import { getDeps } from "@/lib/di";
import type { Episode, VideoServer } from "@/lib/domain/entities";
import { useAnimeData } from "@/lib/hooks/useAnimeData";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useHistoryStore } from "@/lib/store/user";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import { useLocalSearchParams, router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function PlayerLoading({ padTop }: { padTop: number }) {
  return (
    <View className="flex-1 bg-black justify-center items-center" style={{ paddingTop: padTop }}>
      <StatusBar hidden />
      <ActivityIndicator size="large" color="#A855F7" />
    </View>
  );
}

function PlayerContent() {
  const params = useLocalSearchParams<{
    slug?: string;
    number?: string;
    title?: string;
    image?: string;
  }>();
  const slug = params.slug ?? "";
  const number = params.number ?? "";
  const title = params.title ?? "";
  const image = params.image ?? "";
  const insets = useSafeAreaInsets();

  const { streamUrl, streamHeaders, setStream, setLastLanguage, lastLanguage, reset: clearStream } = usePlayerStore();
  const { addToHistory } = useHistoryStore();
  const deps = getDeps();
  const { anime } = useAnimeData(slug);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEpNumber, setCurrentEpNumber] = useState(number);
  const [playState, setPlayState] = useState({ currentTime: 0, duration: 0, isPlaying: false });

  useEffect(() => {
    void deps.playerUIService.setupImmersiveMode();
    return () => {
      void deps.playerUIService.cleanupImmersiveMode();
      clearStream();
    };
  }, [clearStream, deps.playerUIService]);

  const episodes = useMemo(
    () => (anime?.episodes ? orderEpisodes(anime.episodes) : []),
    [anime?.episodes],
  );

  const currentIdx = useMemo(
    () => episodes.findIndex((e) => e.number === currentEpNumber),
    [episodes, currentEpNumber],
  );

  const prevEpisode = useMemo(() => {
    if (currentIdx < 1) return null;
    return episodes[currentIdx - 1];
  }, [episodes, currentIdx]);

  const nextEpisode = useMemo(() => {
    if (currentIdx < 0 || currentIdx >= episodes.length - 1) return null;
    return episodes[currentIdx + 1];
  }, [episodes, currentIdx]);

  const player = useVideoPlayer(null, (instance) => {
    instance.loop = false;
  });

  useEffect(() => {
    if (streamUrl != null) {
      player.replace({ uri: streamUrl, headers: streamHeaders ?? undefined });
      player.play();
    }
  }, [streamUrl, streamHeaders, player]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayState({
        currentTime: player.currentTime,
        duration: player.duration,
        isPlaying: player.playing,
      });
    }, 250);
    return () => { clearInterval(interval); };
  }, [player]);

  const resolveAndPlay = useCallback(async (targetSlug: string, targetEp: Episode) => {
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
      setCurrentEpNumber(targetEp.number);
      setStream(streamResult.stream.url, streamResult.stream.headers ?? null);
      setLastLanguage(server.language);
      addToHistory({
        title,
        url: targetSlug,
        image,
        number: targetEp.number,
        timestamp: Date.now(),
      }).catch(() => {});
    };

    try {
      await attempt(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    }
    setLoading(false);
  }, [deps, setStream, setLastLanguage, lastLanguage, player, addToHistory, title, image]);

  const handlePrev = useCallback(() => {
    if (prevEpisode) { void resolveAndPlay(slug, prevEpisode); }
  }, [prevEpisode, slug, resolveAndPlay]);

  const handleNext = useCallback(() => {
    if (nextEpisode) { void resolveAndPlay(slug, nextEpisode); }
  }, [nextEpisode, slug, resolveAndPlay]);

  const handleBack = useCallback(() => { router.back(); }, []);

  if (streamUrl == null) {
    return <PlayerLoading padTop={insets.top} />;
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />

      <VideoView
        player={player}
        style={{ position: "absolute", top: insets.top, left: 0, right: 0, bottom: 0 }}
        nativeControls={false}
        contentFit="contain"
      />

      <PlayerControls
        player={player}
        isPlaying={playState.isPlaying}
        currentTime={playState.currentTime}
        duration={playState.duration}
        animeTitle={title}
        episodeNumber={currentEpNumber}
        hasPrev={prevEpisode != null}
        hasNext={nextEpisode != null}
        loading={loading}
        insetTop={insets.top}
        onPrev={handlePrev}
        onNext={handleNext}
        onBack={handleBack}
      />

      {error != null && (
        <View className="absolute bottom-20 left-4 right-4 bg-red-500/20 rounded-lg p-3">
          <Text className="text-red-400 text-xs text-center">{error}</Text>
        </View>
      )}
    </View>
  );
}

export default function NativePlayer() {
  return (
    <ErrorBoundary>
      <PlayerContent />
    </ErrorBoundary>
  );
}
