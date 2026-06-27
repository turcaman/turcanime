import { DarkOverlay } from "@/components/DarkOverlay";
import { useAutoHide } from "@/lib/hooks/useAutoHide";
import { Feather } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import type { VideoPlayer } from "expo-video";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TouchableOpacity, View } from "react-native";

interface PlayerControlsProps {
  player: VideoPlayer;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  animeTitle: string;
  episodeNumber: string;
  hasPrev: boolean;
  hasNext: boolean;
  loading: boolean;
  insetTop: number;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayerControls({
  player, isPlaying, currentTime, duration, animeTitle, episodeNumber,
  hasPrev, hasNext, loading, insetTop, onPrev, onNext, onBack,
}: PlayerControlsProps) {
  const [visible, setVisible] = useState(true);
  const [slidingValue, setSlidingValue] = useState<number | null>(null);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const { restartTimer, clearTimer } = useAutoHide(visible, isPlaying, 3000, () => { setVisible(false); });

  const displayTime = slidingValue ?? pendingSeek ?? currentTime;
  const isSliding = slidingValue != null;

  useEffect(() => {
    if (pendingSeek != null && Math.abs(currentTime - pendingSeek) < 1) {
      setPendingSeek(null);
    }
  }, [currentTime, pendingSeek]);

  const toggle = useCallback(() => {
    setVisible((v) => !v);
    clearTimer();
  }, [clearTimer]);

  const seekBack = useCallback(() => {
    player.currentTime = Math.max(0, player.currentTime - 10);
    restartTimer();
  }, [player, restartTimer]);

  const seekForward = useCallback(() => {
    player.currentTime = Math.min(player.duration || 1, player.currentTime + 10);
    restartTimer();
  }, [player, restartTimer]);

  const togglePlay = useCallback(() => {
    if (player.playing) { player.pause(); } else { player.play(); }
    restartTimer();
  }, [player, restartTimer]);

  if (loading) {
    return (
      <View className="absolute inset-0">
        <DarkOverlay />
        <View className="absolute inset-0 justify-center items-center">
          <ActivityIndicator size="large" color="#A855F7" />
        </View>
      </View>
    );
  }

  const btn = "rounded-full justify-center items-center bg-white/10";
  const btnBig = "w-16 h-16 bg-white/15";

  return (
    <View className="absolute inset-0">
      <Pressable className="absolute inset-0" onPress={toggle} />

      {visible && (
        <>
          <DarkOverlay zIndex={1} elevation={1} />

          <View
            className="absolute inset-0"
            pointerEvents="box-none"
            style={{ zIndex: 2 }}
          >
            <View className="flex-1">
              <View className="flex-row items-start px-4" style={{ paddingTop: insetTop + 8 }}>
                <TouchableOpacity onPress={onBack} hitSlop={8} style={{ paddingTop: 2 }}>
                  <Feather name="chevron-left" size={24} color="white" />
                </TouchableOpacity>
                <View className="ml-3 flex-1">
                  <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                    {animeTitle}
                  </Text>
                  <Text className="text-neutral-400 text-xs">
                    Episodio {episodeNumber}
                  </Text>
                </View>
              </View>

              <View className="flex-1" />

              <View className="flex-row items-center justify-center gap-6 px-8">
                <TouchableOpacity onPress={onPrev} disabled={!hasPrev} className={`${btn} w-12 h-12 ${!hasPrev ? "opacity-40" : ""}`}>
                  <Feather name="skip-back" size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={seekBack} className={`${btn} w-12 h-12`}>
                  <Feather name="rotate-ccw" size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={togglePlay} className={`${btn} ${btnBig}`}>
                  <Feather name={isPlaying ? "pause" : "play"} size={28} color="white" style={{ paddingLeft: 2 }} />
                </TouchableOpacity>
                <TouchableOpacity onPress={seekForward} className={`${btn} w-12 h-12`}>
                  <Feather name="rotate-cw" size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onNext} disabled={!hasNext} className={`${btn} w-12 h-12 ${!hasNext ? "opacity-40" : ""}`}>
                  <Feather name="skip-forward" size={22} color="white" />
                </TouchableOpacity>
              </View>

              <View className="flex-1" />

              <View className="px-4 pb-6 pt-3">
                <View className="flex-row items-center gap-2">
                  <Text className={`text-xs w-12 text-right font-mono ${isSliding ? "text-purple-400" : "text-white"}`}>
                    {formatTime(displayTime)}
                  </Text>

                  <View className="flex-1">
                    <Slider
                      style={{ width: "100%", height: 20 }}
                      minimumValue={0}
                      maximumValue={duration > 0 ? duration : 1}
                      value={displayTime}
                      onValueChange={(v) => {
                        clearTimer();
                        setSlidingValue(v);
                      }}
                      onSlidingComplete={(v) => {
                        player.currentTime = v;
                        setPendingSeek(v);
                        setSlidingValue(null);
                        restartTimer();
                      }}
                      minimumTrackTintColor="#A855F7"
                      maximumTrackTintColor="rgba(255,255,255,0.25)"
                      thumbTintColor="#A855F7"
                    />
                  </View>

                  <Text className="text-white text-xs w-12 font-mono">
                    {formatTime(duration)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
