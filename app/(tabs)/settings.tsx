import { SectionTitle } from "@/components/ui/SectionTitle";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useUIStore } from "@/stores/uiStore";
import { useUpdateStore } from "@/stores/updateStore";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Alert, Linking, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const isRefreshingSession = useUIStore((s) => s.isRefreshingSession);
  const [refreshed, setRefreshed] = useState(false);
  const refreshedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateCheckEnabled = useUpdateStore((s) => s.updateCheckEnabled);
  const setUpdateCheckEnabled = useUpdateStore((s) => s.setUpdateCheckEnabled);
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);
  const checkingForUpdates = useUpdateStore((s) => s.checkingForUpdates);
  const lastCheckError = useUpdateStore((s) => s.lastCheckError);
  const currentVersion = useUpdateStore((s) => s.currentVersion);
  const checkForUpdates = useUpdateStore((s) => s.checkForUpdates);

  const appVersion = currentVersion ?? "—";

  useEffect(() => () => {
    const t = refreshedTimer.current;
    if (t != null) clearTimeout(t);
  }, []);

  const handleRefresh = useCallback(() => {
    Alert.alert(
      "Renovar conexión",
      "Si el contenido no carga o ves errores, esto renueva la conexión con el servidor para intentar solucionarlo.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Renovar",
          style: "default",
          onPress: () => {
            useUIStore.getState().triggerSessionRefresh();
            setRefreshed(true);
            if (refreshedTimer.current != null) clearTimeout(refreshedTimer.current);
            refreshedTimer.current = setTimeout(() => setRefreshed(false), 2000);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          <Feather
            name="refresh-cw"
            size={18}
            color="#A855F7"
            style={{ marginRight: 12 }}
          />
          <View className="flex-1">
            <Text className="text-base font-medium text-white">
              {refreshed ? "Conexión renovada" : "Renovar conexión"}
            </Text>
            <Text className="mt-1 text-xs font-semibold tracking-wide text-neutral-400">
              Refresca sesión y caché
            </Text>
          </View>
        </AnimatedPressable>

        <View className="mt-8">
          <SectionTitle>Actualizaciones</SectionTitle>
          <View className="mb-3" />
          <View className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
            <View className="flex-row items-center px-5 py-4">
              <Feather name="bell" size={18} color="#737373" style={{ marginRight: 12 }} />
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
                trackColor={{ false: "#404040", true: "#A855F7" }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View className="h-px bg-neutral-800" />
            <AnimatedPressable
              onPress={checkingForUpdates || updateAvailable ? undefined : handleManualCheck}
              hapticFeedback={true}
              className="flex-row items-center px-5 py-4"
              style={{ opacity: checkingForUpdates ? 0.5 : 1 }}
            >
              <Feather name="download" size={18} color="#A855F7" style={{ marginRight: 12 }} />
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
                  <Feather name="external-link" size={11} color="#A855F7" />
                </AnimatedPressable>
              )}
            </AnimatedPressable>
          </View>
        </View>

        <View className="mt-8">
          <SectionTitle>Acerca de</SectionTitle>
          <View className="mb-3" />
          <View className="flex-row items-center px-5 py-4 rounded-xl border border-neutral-800 bg-neutral-900">
            <Feather name="info" size={18} color="#737373" style={{ marginRight: 12 }} />
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
