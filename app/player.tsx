import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Theme } from "@/constants/Theme";
import { usePlayerStore } from "@/lib/store/playerStore";
import { useUserStore } from "@/lib/store/userStore";
import * as NavigationBar from "expo-navigation-bar";
import { useLocalSearchParams } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect } from "react";
import { ActivityIndicator, StatusBar as RNStatusBar, StyleSheet, View } from "react-native";

function PlayerContent() {
  const { slug, number, title: pTitle, img: pImg } = useLocalSearchParams();
  const { streamUrl, streamHeaders, reset: clearStream } = usePlayerStore();
  const { addToHistory } = useUserStore();

  // Immersive orientation
  useEffect(() => {
    RNStatusBar.setHidden(true, "fade");
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    NavigationBar.setVisibilityAsync("hidden").catch(() => {
      // Silently fail on platforms where navigation bar is not available
    });

    return () => {
      RNStatusBar.setHidden(false, "fade");
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      NavigationBar.setVisibilityAsync("visible").catch(() => {
        // Silently fail on platforms where navigation bar is not available
      });
      clearStream();
    };
  }, [clearStream]);

  // Save to history
  useEffect(() => {
    if (streamUrl && pTitle && pImg) {
      addToHistory({
        title: pTitle as string,
        image: pImg as string,
        url: slug as string,
        number: number as string,
        timestamp: Date.now()
      });
    }
  }, [streamUrl, pTitle, pImg, slug, number, addToHistory]);

  // Video player - initialized directly with URL
  const videoSource = streamUrl
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
      {streamUrl ? (
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
