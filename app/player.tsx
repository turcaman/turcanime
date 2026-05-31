import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Theme } from "@/constants/Theme";
import { useServices } from "@/lib/hooks/useServices";
import { usePlayerStore } from "@/lib/store/playerStore";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

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
    ? { uri: streamUrl, headers: streamHeaders ?? undefined }
    : null;

  const player = useVideoPlayer(videoSource, (instance) => {
    if (videoSource) {
      instance.loop = false;
      instance.play();
    }
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      {streamUrl !== null ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          nativeControls
          buttonOptions={{ showSettings: false, showSubtitles: false }}
        />
      ) : (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  loadingArea: { flex: 1, justifyContent: "center", alignItems: "center" }
});

export default function NativePlayer() {
  return (
    <ErrorBoundary>
      <PlayerContent />
    </ErrorBoundary>
  );
}
