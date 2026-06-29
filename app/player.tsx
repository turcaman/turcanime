import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlayerControls } from "@/components/PlayerControls";
import { orderEpisodes } from "@/lib/domain/services/episodeService";
import { getDeps } from "@/lib/di";
import { useAnimeData } from "@/lib/hooks/useAnimeData";
import { useEpisodeNavigation } from "@/lib/hooks/useEpisodeNavigation";
import { useNetworkStatus } from "@/lib/hooks/useNetworkStatus";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useHistoryStore } from "@/lib/store/user";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import { useLocalSearchParams, router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  const { streamUrl, streamHeaders, reset: clearStream } = usePlayerStore();
  const { addToHistory } = useHistoryStore();
  const deps = getDeps();
  const { anime } = useAnimeData(slug);
  const { isInternetReachable: networkOk } = useNetworkStatus();
  const networkOkRef = useRef<boolean | null>(null);
  networkOkRef.current = networkOk;
  const prevNetworkOk = useRef<boolean | null>(null);
  const saveProgressRef = useRef<() => void>(() => {});
  const [playState, setPlayState] = useState({ currentTime: 0, duration: 0, isPlaying: false });

  const player = useVideoPlayer(null, (instance) => {
    instance.loop = false;
  });

  // Pause + save progress when network drops; root NetworkBanner handles blocking overlay
  useEffect(() => {
    const prev = prevNetworkOk.current;
    prevNetworkOk.current = networkOk;
    if (prev !== false && networkOk === false) {
      saveProgressRef.current();
      player.pause();
    }
  }, [networkOk, player]);

  const {
    resolveAndPlay, loading, error, currentEpNumber, setCurrentEpNumber,
  } = useEpisodeNavigation(player, title, image);

  useEffect(() => {
    setCurrentEpNumber(number);
  }, [number, setCurrentEpNumber]);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayState({
        currentTime: player.currentTime, duration: player.duration, isPlaying: player.playing,
      });
    }, 250);
    return () => { clearInterval(interval); };
  }, [player]);

  const handlePrev = useCallback(() => {
    if (prevEpisode) { void resolveAndPlay(slug, prevEpisode); }
  }, [prevEpisode, slug, resolveAndPlay]);
  const handleNext = useCallback(() => {
    if (nextEpisode) { void resolveAndPlay(slug, nextEpisode); }
  }, [nextEpisode, slug, resolveAndPlay]);
  const handleBack = useCallback(() => { router.back(); }, []);

  const lastSeekKey = useRef("");

  useEffect(() => {
    if (streamUrl == null) return;

    player.replace({ uri: streamUrl, headers: streamHeaders ?? undefined });

    const seekKey = `${slug}_${currentEpNumber}`;
    if (seekKey !== lastSeekKey.current) {
      lastSeekKey.current = seekKey;
      const match = useHistoryStore.getState().lastViewed.find(
        (h) => h.url === slug && h.number === currentEpNumber && (h.progress ?? 0) > 10,
      );
      if (match?.progress != null) {
        try { player.currentTime = match.progress; } catch {}
      }
    }
    // Don't auto-play if offline — user taps play after reconnect
    if (networkOkRef.current !== false) { player.play(); }
  }, [streamUrl, streamHeaders, player, slug, currentEpNumber]);

  const historyCtx = useRef({ title: "", url: "", image: "", number: "" });
  useEffect(() => {
    historyCtx.current = { title, url: slug, image, number: currentEpNumber };
  }, [slug, title, image, currentEpNumber]);

  const saveProgress = useCallback(() => {
    try {
      const ct = player.currentTime;
      const dur = player.duration;
      if (ct > 0 && dur > 0) {
        void addToHistory({
          ...historyCtx.current, progress: ct, duration: dur, timestamp: Date.now(),
        });
      }
    } catch { /* player was released (component unmounting) */ }
  }, [player, addToHistory]);
  saveProgressRef.current = saveProgress;

  useEffect(() => {
    if (streamUrl == null) return;
    const interval = setInterval(saveProgress, 10000);
    return () => { clearInterval(interval); saveProgress(); };
  }, [streamUrl, saveProgress]);

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />

      <VideoView
        key={streamUrl ?? 'no-stream'}
        player={player}
        style={StyleSheet.absoluteFill}
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
        loading={loading || streamUrl == null}
        insetTop={insets.top}
        onPrev={handlePrev}
        onNext={handleNext}
        onBack={handleBack}
      />

      {error != null && (
        <View className="absolute bottom-20 left-4 right-4 bg-neutral-900 rounded-lg border border-neutral-800 p-3">
          <Text className="text-neutral-400 text-xs text-center">{error}</Text>
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
