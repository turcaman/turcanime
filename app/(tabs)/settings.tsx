import { ACCENT_COLOR, MUTED_ICON } from "@/config/source";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useUIStore } from "@/stores/uiStore";
import { useUpdateStore } from "@/stores/updateStore";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState, useCallback } from "react";
import { Alert, Linking, Switch, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const isRefreshingSession = useUIStore((s) => s.isRefreshingSession);
  const sessionRefreshFailed = useUIStore((s) => s.sessionRefreshFailed);
  const [refreshed, setRefreshed] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const userInitiatedRefresh = useRef(false);
  const refreshedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRefreshing = useRef(isRefreshingSession);

  const updateCheckEnabled = useUpdateStore((s) => s.updateCheckEnabled);
  const setUpdateCheckEnabled = useUpdateStore((s) => s.setUpdateCheckEnabled);
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);
  const checkingForUpdates = useUpdateStore((s) => s.checkingForUpdates);
  const lastCheckError = useUpdateStore((s) => s.lastCheckError);
  const currentVersion = useUpdateStore((s) => s.currentVersion);
  const checkForUpdates = useUpdateStore((s) => s.checkForUpdates);

  const appVersion = currentVersion ?? "—";

  const spin = useSharedValue(0);

  useEffect(() => {
    if (isRefreshingSession) {
      spin.value = withRepeat(withTiming(360, { duration: 1200, easing: Easing.linear }), -1);
    } else {
      spin.value = withTiming(0, { duration: 0 });
    }
  }, [isRefreshingSession, spin]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  useEffect(() => () => {
    const t = refreshedTimer.current;
    if (t != null) clearTimeout(t);
    const ft = failedTimer.current;
    if (ft != null) clearTimeout(ft);
  }, []);

  // Show the real refresh outcome only when the user initiated it
  useEffect(() => {
    const wasRefreshing = prevRefreshing.current;
    prevRefreshing.current = isRefreshingSession;
    if (!wasRefreshing || isRefreshingSession || !userInitiatedRefresh.current) return;
    userInitiatedRefresh.current = false;
    if (sessionRefreshFailed) {
      setRefreshFailed(true);
      if (failedTimer.current != null) clearTimeout(failedTimer.current);
      failedTimer.current = setTimeout(() => setRefreshFailed(false), 3000);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setRefreshed(true);
      if (refreshedTimer.current != null) clearTimeout(refreshedTimer.current);
      refreshedTimer.current = setTimeout(() => setRefreshed(false), 2000);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [isRefreshingSession, sessionRefreshFailed]);

  const handleRefresh = useCallback(() => {
    if (useUIStore.getState().isRefreshingSession) {
      Alert.alert("Renovación en curso", "Ya hay una renovación de conexión en curso. Esperá a que termine.");
      return;
    }
    Alert.alert(
      "Renovar conexión",
      "Si el contenido no carga o ves errores, esto renueva la conexión con el servidor para intentar solucionarlo.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Renovar",
          style: "default",
          onPress: () => {
            // Re-check: a refresh may have started while the Alert was open
            if (useUIStore.getState().isRefreshingSession) return;
            userInitiatedRefresh.current = true;
            useUIStore.getState().triggerSessionRefresh();
          },
        },
      ],
    );
  }, []);

  const handleManualCheck = useCallback(() => {
    void checkForUpdates();
  }, [checkForUpdates]);

  const handleDownloadUpdate = useCallback(() => {
    void Linking.openURL("https://turcanime.pages.dev");
  }, []);

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top + 16 }}>
      <View className="px-5 pb-6">
        <SectionTitle>Conexión</SectionTitle>
        <View className="mb-3" />
        <AnimatedPressable
          onPress={handleRefresh}
          disabled={isRefreshingSession}
          hapticFeedback={true}
          className="flex-row items-center w-full px-5 py-4 rounded-xl border border-neutral-800 bg-neutral-900"
          style={{ opacity: isRefreshingSession ? 0.5 : 1 }}
        >
          <Animated.View style={[spinStyle, { marginRight: 12 }]}>
            <Feather name="refresh-cw" size={18} color={ACCENT_COLOR} />
          </Animated.View>
          <View className="flex-1">
            <Text className="text-base font-medium text-white">
              {isRefreshingSession
                ? "Renovando conexión..."
                : refreshFailed
                  ? "Error al renovar"
                  : refreshed
                    ? "Conexión renovada"
                    : "Renovar conexión"}
            </Text>
            <Text className="mt-1 text-xs font-semibold tracking-wide text-neutral-400">
              {isRefreshingSession ? "Renovando sesión y caché..." : "Refresca sesión y caché"}
            </Text>
          </View>
        </AnimatedPressable>

        <View className="mt-8">
          <SectionTitle>Actualizaciones</SectionTitle>
          <View className="mb-3" />
          <View className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
            <View className="flex-row items-center px-5 py-4">
              <Feather name="bell" size={18} color={MUTED_ICON} style={{ marginRight: 12 }} />
              <View className="flex-1">
                <Text className="text-base font-medium text-white">
                  Buscar actualizaciones
                </Text>
                <Text className="mt-1 text-xs font-semibold tracking-wide text-neutral-400">
                  Al iniciar la app
                </Text>
              </View>
              <Switch
                value={updateCheckEnabled}
                onValueChange={(v) => { void setUpdateCheckEnabled(v); }}
                trackColor={{ false: "#404040", true: ACCENT_COLOR }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View className="h-px bg-neutral-800" />
            <AnimatedPressable
              onPress={updateAvailable ? undefined : handleManualCheck}
              disabled={checkingForUpdates}
              hapticFeedback={!checkingForUpdates && !updateAvailable}
              className="flex-row items-center px-5 py-4"
              style={{ opacity: checkingForUpdates ? 0.5 : 1 }}
            >
              <Feather name="download" size={18} color={ACCENT_COLOR} style={{ marginRight: 12 }} />
              <View className="flex-1 min-w-0">
                <Text className="text-base font-medium text-white">
                  Buscar actualización
                </Text>
                <View className="h-[18px] justify-center mt-0.5">
                  {checkingForUpdates && (
                    <Text className="text-xs font-semibold tracking-wide text-neutral-500">
                      Buscando...
                    </Text>
                  )}
                  {!checkingForUpdates && lastCheckError && (
                    <Text className="text-xs font-semibold tracking-wide text-red-400/70">
                      {lastCheckError}
                    </Text>
                  )}
                  {!checkingForUpdates && !lastCheckError && updateAvailable && (
                    <Text className="text-xs font-semibold tracking-wide text-purple-400">
                      v{updateAvailable} disponible
                    </Text>
                  )}
                  {!checkingForUpdates && !lastCheckError && !updateAvailable && appVersion && (
                    <Text className="text-xs font-semibold tracking-wide text-emerald-400">
                      Estás al día
                    </Text>
                  )}
                </View>
              </View>
              {!checkingForUpdates && !lastCheckError && updateAvailable && (
                <AnimatedPressable
                  onPress={handleDownloadUpdate}
                  className="flex-row items-center gap-1 ml-auto flex-shrink-0"
                >
                  <Text className="text-xs font-semibold tracking-wide text-purple-400">
                    Descargar
                  </Text>
                  <Feather name="external-link" size={11} color={ACCENT_COLOR} />
                </AnimatedPressable>
              )}
            </AnimatedPressable>
          </View>
        </View>

        <View className="mt-8">
          <SectionTitle>Acerca de</SectionTitle>
          <View className="mb-3" />
          <View className="flex-row items-center px-5 py-4 rounded-xl border border-neutral-800 bg-neutral-900">
            <Feather name="info" size={18} color={MUTED_ICON} style={{ marginRight: 12 }} />
            <View className="flex-1">
              <Text className="text-base font-medium text-white">Versión {appVersion}</Text>
              <Text className="mt-1 text-xs font-semibold tracking-wide text-neutral-400">Turcanime</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
