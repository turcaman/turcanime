import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useServices } from "@/lib/hooks/useServices";
import { usePlayerStore } from "@/lib/store/playerStore";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

function PlayerContent() {
  const { streamUrl, streamHeaders, reset: clearStream } = usePlayerStore();
  const { playerUIService } = useServices();

  useEffect(() => {
    void playerUIService.setupImmersiveMode();

    return () => {
      void playerUIService.cleanupImmersiveMode();
      clearStream();
    };
  }, [clearStream, playerUIService]);

  const videoSource = streamUrl !== null
    ? { uri: streamUrl, headers: streamHeaders ?? undefined, contentType: "hls" as const }
    : null;

  const player = useVideoPlayer(videoSource, (instance) => {
    if (videoSource) {
      instance.loop = false;
      instance.play();
    }
  });

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />
      {streamUrl !== null ? (
        <VideoView
          player={player}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          nativeControls
          buttonOptions={{ showSettings: false, showSubtitles: false }}
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
