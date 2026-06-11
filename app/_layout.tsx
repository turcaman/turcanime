import "../global.css";
import { NetworkBanner } from "@/components/NetworkBanner";
import { initializeDeps } from "@/lib/di";
import { useNetworkStatus } from "@/lib/hooks/useNetworkStatus";
import { useUserInitializationStore } from "@/lib/store/user";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

function RootInner() {
  const [ready, setReady] = useState(false);
  const { isInternetReachable } = useNetworkStatus();

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
      <View className="flex-1 bg-black" />
    );
  }

  return (
    <View className="flex-1 bg-black">
      <NetworkBanner visible={isInternetReachable === false} />
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: "#000000" },
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
