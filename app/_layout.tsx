import "../global.css";
import { CACHE_PREFIXES } from "@/config/cache";
import { NetworkBanner } from "@/components/NetworkBanner";
import { WebViewWorker } from "@/components/WebViewWorker";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore, EPISODE_ORDER_KEY } from "@/stores/settingsStore";
import { useUserInitializationStore } from "@/stores/userIndex";
import { useUpdateStore, UPDATE_CHECK_KEY } from "@/stores/updateStore";
import { UpdateModal } from "@/components/UpdateModal";
import { useHistoryStore, HISTORY_KEY } from "@/stores/historyStore";
import { useSearchHistoryStore, SEARCHES_KEY } from "@/stores/searchHistoryStore";
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

const SESSION_REFRESH_DELAY = 2000;
const SESSION_REFRESH_COOLDOWN = 5 * 60 * 1000;
const UPDATE_CHECK_ATTEMPTS = 3;
const UPDATE_CHECK_RETRY_DELAY = 2000;
// Caches whose content may depend on the origin session and must be wiped on renewal
const SESSION_SENSITIVE_CACHE_PREFIXES = [CACHE_PREFIXES.HOME, CACHE_PREFIXES.SEARCH];

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
  const { isInternetReachable, connectionType } = useNetworkStatus();
  const sessionRefreshTrigger = useUIStore((s) => s.sessionRefreshTrigger);
  const triggerSessionRefresh = useUIStore((s) => s.triggerSessionRefresh);
  const setSessionRefreshing = useUIStore((s) => s.setSessionRefreshing);
  const setSessionRefreshFailed = useUIStore((s) => s.setSessionRefreshFailed);
  const prevConnectionType = useRef<ConnectionType>(null);
  const prevReachable = useRef<boolean | null>(null);
  const lastRefreshTime = useRef(0);

  useEffect(() => {
    const prev = prevConnectionType.current;
    prevConnectionType.current = connectionType;
    if (prev !== null && prev !== connectionType && prev !== "unknown" && connectionType !== "unknown") {
      const timer = setTimeout(() => {
        // Flap WiFi/5G must not wash on every switch: a fresh session stays
        if (Date.now() - lastRefreshTime.current < SESSION_REFRESH_COOLDOWN) {
          logger.debug("lifecycle", `Connection ${prev}→${connectionType}, wash skipped by cooldown`);
          return;
        }
        logger.info("lifecycle", `Connection ${prev}→${connectionType}, triggering wash`);
        triggerSessionRefresh("connection-flap");
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [connectionType, triggerSessionRefresh]);

  useEffect(() => {
    const prev = prevReachable.current;
    prevReachable.current = isInternetReachable;
    if (prev === false && isInternetReachable === true) {
      const timer = setTimeout(() => {
        if (Date.now() - lastRefreshTime.current >= SESSION_REFRESH_COOLDOWN) {
          logger.info("lifecycle", "Regained connection, triggering wash");
          triggerSessionRefresh("reconnect");
        } else {
          logger.debug("lifecycle", "Regained connection, wash skipped by cooldown");
        }
        const updateState = useUpdateStore.getState();
        if (updateState.updateCheckEnabled !== false) {
          void updateState.checkForUpdates();
        }
      }, SESSION_REFRESH_DELAY);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isInternetReachable, triggerSessionRefresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const elapsed = Date.now() - lastRefreshTime.current;
      if (elapsed < SESSION_REFRESH_COOLDOWN) {
        logger.debug("lifecycle", `Foreground after ${(elapsed / 1000).toFixed(0)}s, wash skipped by cooldown`);
        return;
      }
      logger.info("lifecycle", `Foreground after ${(elapsed / 1000).toFixed(0)}s, triggering wash`);
      triggerSessionRefresh("foreground");
    });
    return () => sub.remove();
  }, [triggerSessionRefresh]);

  useEffect(() => {
    if (sessionRefreshTrigger === 0) return;

    const doRefresh = async () => {
      const source = useUIStore.getState().sessionRefreshSource ?? "unknown";
      try {
        logger.info("lifecycle", `Proactive wash started (${source})`);
        // Serialize: refresh session first, then let cache invalidation drive
        // a single fetchHome. No UI wipe, no concurrent safety fetch.
        await refreshSession();
        // Cooldown counts only successful refreshes so failures can be retried soon
        lastRefreshTime.current = Date.now();
        setSessionRefreshFailed(false);
        // Only wipe session-sensitive caches; anime/servers/stream data stays valid across sessions
        const allKeys = await storage.getAllKeys();
        const cacheKeys = allKeys.filter((k) =>
          SESSION_SENSITIVE_CACHE_PREFIXES.some((prefix) => k.startsWith(prefix)),
        );
        await Promise.all(cacheKeys.map((k) => storage.remove(k)));
        logger.info("lifecycle", `Proactive wash done, wiped ${cacheKeys.length} session caches`);
        // invalidateCache makes the home screen refetch after the cache wipe
        useSettingsStore.getState().invalidateCache();
      } catch {
        logger.warn("session", "Session refresh failed, in-flight fetch retry decides");
        setSessionRefreshFailed(true);
      } finally {
        useUIStore.setState({ sessionRefreshSource: null });
        setSessionRefreshing(false);
      }
    };
    void doRefresh();
  }, [sessionRefreshTrigger, setSessionRefreshing, setSessionRefreshFailed]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      logger.setStorage(storage);
      await sessionManager.initialize();
      // The mount fires an initial active event; seed the cooldown so it
      // doesn't trigger a redundant wash right after boot.
      lastRefreshTime.current = Date.now();
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="anime/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="player" options={{ headerShown: false, animation: "fade_from_bottom", statusBarHidden: true }} />
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
