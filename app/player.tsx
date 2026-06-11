import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useServices } from "@/lib/hooks/useServices";
import { usePlayerStore } from "@/lib/store/playerStore";
import { StatusBar } from "expo-status-bar";
import { Video, ResizeMode } from "expo-av";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

function PlayerContent() {
  const { streamUrl, streamHeaders, reset: clearStream } = usePlayerStore();
  const { playerUIService } = useServices();
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    void playerUIService.setupImmersiveMode();

    return () => {
      void playerUIService.cleanupImmersiveMode();
      clearStream();
    };
  }, [clearStream, playerUIService]);

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />
      {streamUrl !== null ? (
        <Video
          ref={videoRef}
          source={{ uri: streamUrl, headers: streamHeaders ?? undefined }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          useNativeControls
          isLooping={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#A855F7" />
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
