import { NetworkBanner } from "@/components/NetworkBanner";
import { Theme } from "@/constants/Theme";
import { getDeps, initializeDeps } from "@/lib/di";
import { useNetworkStatus, type ConnectionType } from "@/lib/hooks/useNetworkStatus";
import { refreshSession } from "@/lib/core/infrastructure";
import { useDetailsStore } from "@/lib/store/detailsStore";
import { useHomeStore } from "@/lib/store/homeStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useSettingsStore, useUserInitializationStore } from "@/lib/store/user";
import { WebViewWorker } from "@/lib/infrastructure/components/WebViewWorker";
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

  // Detect network type change (wifi ↔ cellular) → auto session refresh
  useEffect(() => {
    const prev = prevConnectionType.current;
    prevConnectionType.current = connectionType;

    if (prev !== null && prev !== connectionType &&
        prev !== 'unknown' && connectionType !== 'unknown') {
      const timer = setTimeout(() => {
        triggerSessionRefresh();
      }, 2000);
      return () => { clearTimeout(timer); };
    }

    return undefined;
  }, [connectionType, triggerSessionRefresh]);

  // Detect reachability restore → any reconnection (WiFi→WiFi, data→data, airplane mode off, VPN)
  useEffect(() => {
    const prev = prevReachable.current;
    prevReachable.current = isInternetReachable;

    if (prev === false && isInternetReachable === true) {
      const timer = setTimeout(() => {
        triggerSessionRefresh();
      }, 2000);
      return () => { clearTimeout(timer); };
    }

    return undefined;
  }, [isInternetReachable, triggerSessionRefresh]);

  // Detect app returning to foreground after network changes in background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const elapsed = Date.now() - lastRefreshTime.current;
      if (elapsed < 5 * 60 * 1000) return;
      triggerSessionRefresh();
    });
    return () => sub.remove();
  }, [triggerSessionRefresh]);

  // Execute full session refresh flow
  useEffect(() => {
    if (sessionRefreshTrigger === 0) return;

    const doRefresh = async () => {
      try {
        lastRefreshTime.current = Date.now();

        // Show loading state immediately before slow operations
        useHomeStore.getState().reset();
        useDetailsStore.getState().reset();
        useHomeStore.getState().setIsHomeLoading(true);

        await refreshSession();
        await getDeps().animeService.clearAnimeCache();

        useHomeStore.getState().fetchHome(true);
        useSettingsStore.getState().invalidateCache();
      } finally {
        setSessionRefreshing(false);
      }
    };

    doRefresh();
  }, [sessionRefreshTrigger, setSessionRefreshing]);

  useEffect(() => {
    let cancelled = false;

    initializeDeps().ready
      .then(() => useUserInitializationStore.getState().initialize())
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((error) => {
        console.error('[RootLayout] Initialization failed:', error);
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: Theme.colors.background }} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <NetworkBanner visible={!isInternetReachable} />
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Theme.colors.background },
        statusBarStyle: 'light',
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="anime/[slug]" options={{ headerShown: false }} />
        <Stack.Screen
          name="player"
          options={{
            headerShown: false,
            animation: "fade_from_bottom",
            statusBarHidden: true,
          }}
        />
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
