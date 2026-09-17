import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlayerControls } from "@/components/PlayerControls";
import { orderEpisodes } from "@/hooks/episodeHelpers";
import { useAnimeData } from "@/hooks/useAnimeData";
import { useEpisodeNavigation } from "@/hooks/useEpisodeNavigation";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePlayerStore } from "@/stores/playerStore";
import { useHistoryStore } from "@/stores/historyStore";
import { findHistoryEntry } from "@/utils/history";
import { setupImmersiveMode, cleanupImmersiveMode } from "@/services/playerUI";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NEXT_EPISODE_COUNTDOWN_SECONDS = 10;

function PlayerContent() {
  const params = useLocalSearchParams<{ slug?: string; number?: string; title?: string; image?: string }>();
  const slug = params.slug ?? "";
  const number = params.number ?? "";
  const title = params.title ?? "";
  const image = params.image ?? "";
  const insets = useSafeAreaInsets();

  const streamUrl = usePlayerStore((s) => s.streamUrl);
  const streamHeaders = usePlayerStore((s) => s.streamHeaders);
  const clearStream = usePlayerStore((s) => s.reset);
  const addToHistory = useHistoryStore((s) => s.addToHistory);
  const { anime } = useAnimeData(slug);
  const { isInternetReachable: networkOk } = useNetworkStatus();
  const networkOkRef = useRef<boolean | null>(null);
  networkOkRef.current = networkOk;
  const prevNetworkOk = useRef<boolean | null>(null);
  const saveProgressRef = useRef<() => void>(() => {});
  const [playState, setPlayState] = useState({ currentTime: 0, duration: 0, isPlaying: false });

  const player = useVideoPlayer(null, (instance) => { instance.loop = false; });

  useEffect(() => {
    const prev = prevNetworkOk.current;
    prevNetworkOk.current = networkOk;
    if (prev !== false && networkOk === false) {
      saveProgressRef.current();
      player.pause();
    }
  }, [networkOk, player]);

  const { resolveAndPlay, loading, error, currentEpNumber, setCurrentEpNumber } = useEpisodeNavigation(player, title, image);

  useEffect(() => { setCurrentEpNumber(number); }, [number, setCurrentEpNumber]);

  useEffect(() => {
    const init = async () => {
      await setupImmersiveMode();
    };
    void init();
    return () => {
      void cleanupImmersiveMode();
      void clearStream();
    };
  }, [clearStream]);

  const episodes = useMemo(() => (anime?.episodes ? orderEpisodes(anime.episodes) : []), [anime?.episodes]);
  const currentIdx = useMemo(() => episodes.findIndex((e) => e.number === currentEpNumber), [episodes, currentEpNumber]);
  const prevEpisode = useMemo(() => (currentIdx < 1 ? null : episodes[currentIdx - 1]), [episodes, currentIdx]);
  const nextEpisode = useMemo(() => (currentIdx < 0 || currentIdx >= episodes.length - 1 ? null : episodes[currentIdx + 1]), [episodes, currentIdx]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayState({ currentTime: player.currentTime, duration: player.duration, isPlaying: player.playing });
    }, 250);
    return () => clearInterval(interval);
  }, [player]);

  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState<number | null>(null);
  const nextEpisodeTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const nextEpisodeCountdownRef = useRef<number | null>(null);

  const clearNextEpisodeTimer = useCallback(() => {
    if (nextEpisodeTimer.current) {
      clearInterval(nextEpisodeTimer.current);
      nextEpisodeTimer.current = undefined;
    }
    nextEpisodeCountdownRef.current = null;
    setNextEpisodeCountdown(null);
  }, []);

  const confirmNextEpisode = useCallback(() => {
    clearNextEpisodeTimer();
    if (nextEpisode) {
      saveProgressRef.current();
      void resolveAndPlay(slug, nextEpisode);
    }
  }, [clearNextEpisodeTimer, nextEpisode, slug, resolveAndPlay]);

  const cancelNextEpisode = useCallback(() => {
    clearNextEpisodeTimer();
  }, [clearNextEpisodeTimer]);

  const startNextEpisodeCountdown = useCallback(() => {
    if (!nextEpisode) return;
    nextEpisodeCountdownRef.current = NEXT_EPISODE_COUNTDOWN_SECONDS;
    setNextEpisodeCountdown(NEXT_EPISODE_COUNTDOWN_SECONDS);
    nextEpisodeTimer.current = setInterval(() => {
      const prev = nextEpisodeCountdownRef.current;
      if (prev === null || prev <= 0) {
        clearNextEpisodeTimer();
        saveProgressRef.current();
        void resolveAndPlay(slug, nextEpisode);
        return;
      }
      nextEpisodeCountdownRef.current = prev - 1;
      setNextEpisodeCountdown(prev - 1);
    }, 1000);
  }, [nextEpisode, clearNextEpisodeTimer, slug, resolveAndPlay]);

  const handlePrev = useCallback(() => { if (prevEpisode) void resolveAndPlay(slug, prevEpisode); }, [prevEpisode, slug, resolveAndPlay]);
  const handleNext = useCallback(() => { if (nextEpisode) void resolveAndPlay(slug, nextEpisode); }, [nextEpisode, slug, resolveAndPlay]);
  const handleBack = useCallback(() => router.back(), []);

  const lastSeekKey = useRef("");

  useEffect(() => {
    if (streamUrl == null) return;
    let cancelled = false;
    const run = async () => {
      await player.replaceAsync({ uri: streamUrl, headers: streamHeaders ?? undefined });
      if (cancelled) return;

      try { player.currentTime = 0; } catch {}

      const seekKey = `${slug}_${currentEpNumber}`;
      if (seekKey !== lastSeekKey.current) {
        lastSeekKey.current = seekKey;
        const match = findHistoryEntry(useHistoryStore.getState().lastViewed, slug, currentEpNumber);
        const hasSignificantProgress = match != null && (match.progress ?? 0) > 10;
        const isCompleted = match != null && match.progress != null && match.duration != null && match.duration > 0 && match.progress / match.duration >= 0.9;
        if (match?.progress != null && hasSignificantProgress && !isCompleted) {
          try { player.currentTime = match.progress; } catch {}
        }
      }
      if (networkOkRef.current !== false) player.play();
    };
    void run();
    return () => { cancelled = true; };
  }, [streamUrl, streamHeaders, player, slug, currentEpNumber]);

  const historyCtx = useRef({ title, url: slug, image, number: currentEpNumber });
  historyCtx.current = { title, url: slug, image, number: currentEpNumber };

  const saveProgress = useCallback(() => {
    try {
      const ct = player.currentTime;
      const dur = player.duration;
      if (ct > 0 && dur > 0) {
        let progress = ct;
        if (dur > 0 && progress / dur >= 0.9) progress = dur;
        void addToHistory({ ...historyCtx.current, progress, duration: dur, timestamp: Date.now() });
      }
    } catch {}
  }, [player, addToHistory]);
  saveProgressRef.current = saveProgress;

  useEffect(() => {
    if (streamUrl == null) return;
    const interval = setInterval(saveProgress, 10000);
    return () => { clearInterval(interval); };
  }, [streamUrl, saveProgress]);

  useEffect(() => {
    return () => {
      saveProgress();
    };
  }, [saveProgress]);

  const hasPlayedRef = useRef(false);

  useEffect(() => {
    const sub = player.addListener("playingChange", ({ isPlaying: playing }) => {
      if (playing) hasPlayedRef.current = true;
    });
    return () => { sub.remove(); };
  }, [player]);

  useEffect(() => {
    const sub = player.addListener("playToEnd", () => {
      if (nextEpisode && hasPlayedRef.current) {
        hasPlayedRef.current = false;
        startNextEpisodeCountdown();
      }
    });
    return () => { sub.remove(); };
  }, [player, nextEpisode, startNextEpisodeCountdown]);

  useEffect(() => {
    clearNextEpisodeTimer();
  }, [currentEpNumber, clearNextEpisodeTimer]);

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />
      <VideoView key={streamUrl ?? "no-stream"} player={player} style={StyleSheet.absoluteFill} nativeControls={false} contentFit="contain" />
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
        nextEpisodeCountdown={nextEpisodeCountdown}
        nextEpisodeNumber={nextEpisode?.number ?? null}
        onPrev={handlePrev}
        onNext={handleNext}
        onBack={handleBack}
        onCancelNextEpisode={cancelNextEpisode}
        onConfirmNextEpisode={confirmNextEpisode}
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
