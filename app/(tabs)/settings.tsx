import { SectionTitle } from "@/components/ui/SectionTitle";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useUIStore } from "@/stores/uiStore";
import Constants from "expo-constants";
import { storage } from "@/utils/storage";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Alert, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const isRefreshingSession = useUIStore((s) => s.isRefreshingSession);
  const [refreshed, setRefreshed] = useState(false);
  const refreshedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [updateEnabled, setUpdateEnabled] = useState(true);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const appVersion = Constants.expoConfig?.version ?? "—";

  useEffect(() => () => {
    const t = refreshedTimer.current;
    if (t != null) clearTimeout(t);
  }, []);

  useEffect(() => {
    storage.get<boolean>("update_check_enabled").then((v) => {
      if (v != null) setUpdateEnabled(v);
    }).catch(() => {});
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

  const handleToggleUpdate = useCallback(async (value: boolean) => {
    setUpdateEnabled(value);
    await storage.set("update_check_enabled", value);
  }, []);

  const handleCheckUpdate = useCallback(async () => {
    const current = Constants.expoConfig?.version;
    if (!current) {
      Alert.alert("Error", "No se pudo obtener la versión actual.");
      return;
    }
    setCheckingUpdate(true);
    try {
      const res = await fetch(
        "https://api.github.com/repos/turcaman/turcanime-desktop/releases/latest",
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json() as { tag_name?: string };
      const latest = (data.tag_name ?? "").replace(/^v/, "");
      if (!latest) throw new Error("No tag");

      const parse = (v: string) => v.split(".").map((n) => parseInt(n, 10) || 0);
      const currentParts = parse(current);
      const latestParts = parse(latest);
      const isNewer = latestParts.some((n, i) => n > (currentParts[i] ?? 0));

      if (isNewer) {
        Alert.alert(
          "Actualización disponible",
          `Versión ${latest} disponible. Descargala desde turcanime.pages.dev`,
          [{ text: "OK" }],
        );
      } else {
        Alert.alert("Estás al día", `Turcanime v${current}`);
      }
    } catch {
      Alert.alert("Error", "No se pudo buscar actualizaciones.");
    } finally {
      setCheckingUpdate(false);
    }
  }, []);

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top + 16 }}>
      <View className="px-5 pb-6">
        <View className="mb-6">
          <SectionTitle>Conexión</SectionTitle>
        </View>
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
          <View className="mb-6">
            <SectionTitle>Actualizaciones</SectionTitle>
          </View>
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
                value={updateEnabled}
                onValueChange={handleToggleUpdate}
                trackColor={{ false: "#404040", true: "#A855F7" }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View className="h-px bg-neutral-800" />
            <AnimatedPressable
              onPress={handleCheckUpdate}
              disabled={checkingUpdate}
              hapticFeedback={true}
              className="flex-row items-center px-5 py-4"
              style={{ opacity: checkingUpdate ? 0.5 : 1 }}
            >
              <Feather name="download" size={18} color="#A855F7" style={{ marginRight: 12 }} />
              <View className="flex-1">
                <Text className="text-base font-medium text-white">
                  Buscar actualización
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        </View>

        <View className="mt-8">
          <View className="mb-6">
            <SectionTitle>Acerca de</SectionTitle>
          </View>
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
