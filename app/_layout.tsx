import "../global.css";
import { NetworkBanner } from "@/components/NetworkBanner";
import { WebViewWorker } from "@/components/WebViewWorker";
import { useHomeStore } from "@/stores/homeStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore, useUserInitializationStore } from "@/stores/userIndex";
import { useHistoryStore } from "@/stores/historyStore";
import { useSearchHistoryStore } from "@/stores/searchHistoryStore";
import { useNetworkStatus, type ConnectionType } from "@/hooks/useNetworkStatus";
import { sessionManager, refreshSession } from "@/services/session";
import { storage } from "@/utils/storage";
import { logger } from "@/utils/logger";
import type { HistoryItem } from "@/types";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

function RootInner() {
  const [ready, setReady] = useState(false);
  const { isInternetReachable, connectionType } = useNetworkStatus();
  const { sessionRefreshTrigger, triggerSessionRefresh, setSessionRefreshing } = useUIStore();
  const prevConnectionType = useRef<ConnectionType>(null);
  const prevReachable = useRef<boolean | null>(null);
  const lastRefreshTime = useRef(0);
  const hasBeenActive = useRef(false);

  useEffect(() => {
    const prev = prevConnectionType.current;
    prevConnectionType.current = connectionType;
    if (prev !== null && prev !== connectionType && prev !== "unknown" && connectionType !== "unknown") {
      const timer = setTimeout(() => triggerSessionRefresh(), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [connectionType, triggerSessionRefresh]);

  useEffect(() => {
    const prev = prevReachable.current;
    prevReachable.current = isInternetReachable;
    if (prev === false && isInternetReachable === true) {
      const timer = setTimeout(() => triggerSessionRefresh(), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isInternetReachable, triggerSessionRefresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (!hasBeenActive.current) {
        hasBeenActive.current = true;
        return;
      }
      const elapsed = Date.now() - lastRefreshTime.current;
      if (elapsed < 5 * 60 * 1000) return;
      triggerSessionRefresh();
    });
    return () => sub.remove();
  }, [triggerSessionRefresh]);

  useEffect(() => {
    if (sessionRefreshTrigger === 0) return;

    const doRefresh = async () => {
      try {
        lastRefreshTime.current = Date.now();
        useHomeStore.getState().prepareRefresh();

        let sessionOk = false;
        try {
          await refreshSession();
          sessionOk = true;
        } catch {
          logger.warn("refresh", "Session refresh failed, skipping cache clear and using stale cache");
        }

        if (sessionOk) {
          const allKeys = await storage.getAllKeys();
          const cacheKeys = allKeys.filter((k) => k.startsWith("ch_") || k.startsWith("search_") || k.startsWith("anime_") || k.startsWith("suggestions_") || k.startsWith("stream_") || k.startsWith("servers_"));
          await Promise.all(cacheKeys.map((k) => storage.remove(k)));
          void useHomeStore.getState().fetchHome(true);
          useSettingsStore.getState().invalidateCache();
        } else {
          void useHomeStore.getState().fetchHome(false);
        }
      } finally {
        setSessionRefreshing(false);
      }
    };
    void doRefresh();

    // Safety net: if data hasn't loaded within 12s, auto-retry the fetch
    const safetyTimer = setTimeout(() => {
      const { homeData, isHomeLoading } = useHomeStore.getState();
      if (homeData.recent.length === 0 && !isHomeLoading) {
        logger.info("refresh", "Safety timer: data still empty, retrying fetch...");
        void useHomeStore.getState().fetchHome(true);
      }
    }, 12000);

    return () => clearTimeout(safetyTimer);
  }, [sessionRefreshTrigger, setSessionRefreshing]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      logger.setStorage(storage);
      await sessionManager.initialize();
      const [history, searches, order, watchedData] = await Promise.all([
        storage.get<HistoryItem[]>("last_viewed"),
        storage.get<string[]>("recent_searches"),
        storage.get<"asc" | "desc">("episode_order"),
        storage.get<string[]>("watched_episodes"),
      ]);
      useHistoryStore.getState().initialize(history ?? [], watchedData ?? []);
      useSearchHistoryStore.getState().initialize(searches ?? []);
      useSettingsStore.getState().initialize(order ?? "asc");
      useUserInitializationStore.setState({ isInitialized: true });
      if (!cancelled) setReady(true);
    };
    init().catch((error) => {
      console.error("[RootLayout] Initialization failed:", error);
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="anime/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="player" options={{ headerShown: false, animation: "fade_from_bottom", statusBarHidden: true }} />
      </Stack>
      <WebViewWorker />
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
