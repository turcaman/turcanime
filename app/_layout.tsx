import "../global.css";
import { NetworkBanner } from "@/components/NetworkBanner";
import { WebViewWorker } from "@/components/WebViewWorker";
import { useSettingsStore, EPISODE_ORDER_KEY } from "@/stores/settingsStore";
import { useUserInitializationStore } from "@/stores/userIndex";
import { useUpdateStore, UPDATE_CHECK_KEY } from "@/stores/updateStore";
import { UpdateModal } from "@/components/UpdateModal";
import { useHistoryStore, HISTORY_KEY } from "@/stores/historyStore";
import { useSearchHistoryStore, SEARCHES_KEY } from "@/stores/searchHistoryStore";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { sessionManager } from "@/services/session";
import { resetToPortrait, isPlayerActive } from "@/services/playerUI";
import { storage } from "@/utils/storage";
import { logger } from "@/utils/logger";
import type { HistoryItem } from "@/types";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const RECONNECT_UPDATE_DELAY = 2000;
const UPDATE_CHECK_ATTEMPTS = 3;
const UPDATE_CHECK_RETRY_DELAY = 2000;

function runUpdateCheckWithRetry(attempt = 1): void {
  void useUpdateStore.getState().checkForUpdates().then((ok) => {
    const { updateCheckEnabled } = useUpdateStore.getState();
    if (!ok && updateCheckEnabled !== false && attempt < UPDATE_CHECK_ATTEMPTS) {
      setTimeout(() => runUpdateCheckWithRetry(attempt + 1), UPDATE_CHECK_RETRY_DELAY * attempt);
    }
  });
}

function RootInner() {
  const [ready, setReady] = useState(false);
  const { isInternetReachable } = useNetworkStatus();
  const prevReachable = useRef<boolean | null>(null);

  useEffect(() => {
    const prev = prevReachable.current;
    prevReachable.current = isInternetReachable;
    if (prev === false && isInternetReachable === true) {
      const timer = setTimeout(() => {
        const updateState = useUpdateStore.getState();
        if (updateState.updateCheckEnabled !== false) {
          void updateState.checkForUpdates();
        }
      }, RECONNECT_UPDATE_DELAY);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isInternetReachable]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      // Android may re-apply the orientation saved in the ActivityRecord during
      // an activity recreation, after the one-shot boot reset already ran.
      // Re-assert portrait on every foreground return unless playback owns it
      if (!isPlayerActive()) void resetToPortrait();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      logger.setStorage(storage);
      await resetToPortrait();
      await sessionManager.initialize();
      const [history, searches, order, updateCheckEnabled] = await Promise.all([
        storage.get<HistoryItem[]>(HISTORY_KEY),
        storage.get<string[]>(SEARCHES_KEY),
        storage.get<"asc" | "desc">(EPISODE_ORDER_KEY),
        storage.get<boolean>(UPDATE_CHECK_KEY),
      ]);
      useHistoryStore.getState().initialize(history ?? []);
      useSearchHistoryStore.getState().initialize(searches ?? []);
      useSettingsStore.getState().initialize(order ?? "asc");
      useUpdateStore.getState().initialize(updateCheckEnabled !== false);
      useUserInitializationStore.setState({ isInitialized: true });
      logger.info("lifecycle", "App boot complete");
      if (!cancelled) setReady(true);

      if (updateCheckEnabled !== false) {
        runUpdateCheckWithRetry();
      }
    };
    init().catch((error) => {
      logger.error("lifecycle", "Initialization failed", error);
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <View className="flex-1 bg-black" />;
  }

  return (
    <View className="flex-1 bg-black">
      <NetworkBanner visible={isInternetReachable === false} />
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: "#000000" },
          statusBarStyle: "light",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, orientation: "portrait" }} />
        <Stack.Screen name="anime/[slug]" options={{ headerShown: false, orientation: "portrait" }} />
        {/* player owns the screen orientation via setupImmersiveMode; declaring
            landscape here keeps RNScreens from re-applying UNSPECIFIED over the
            JS lock on every focus */}
        <Stack.Screen name="player" options={{ headerShown: false, animation: "fade_from_bottom", statusBarHidden: true, orientation: "landscape" }} />
      </Stack>
      <WebViewWorker />
      <UpdateModal />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootInner />
    </SafeAreaProvider>
  );
}
