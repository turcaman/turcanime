import { SectionTitle } from "@/components/ui/SectionTitle";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useUIStore } from "@/stores/uiStore";
import Constants from "expo-constants";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Alert, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const isRefreshingSession = useUIStore((s) => s.isRefreshingSession);
  const [refreshed, setRefreshed] = useState(false);
  const refreshedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appVersion = Constants.expoConfig?.version ?? "—";

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

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top + 16 }}>
      <Text className="mb-6 px-5 text-2xl font-bold text-white">Ajustes</Text>

      <View className="px-5">
        <View className="mb-4">
          <SectionTitle>Conexión</SectionTitle>
        </View>
        <AnimatedPressable
          onPress={handleRefresh}
          disabled={isRefreshingSession}
          hapticFeedback={true}
          className="flex-row items-center w-full px-4 py-3.5 rounded-lg border border-neutral-800/50 bg-neutral-900/50"
          style={{ opacity: isRefreshingSession ? 0.5 : 1 }}
        >
          <Feather
            name="refresh-cw"
            size={16}
            color="#A855F7"
            style={{ marginRight: 12 }}
          />
          <View className="flex-1">
            <Text className="text-sm text-neutral-200">
              {refreshed ? "Conexión renovada" : "Renovar conexión"}
            </Text>
            <Text className="mt-0.5 text-[11px] text-neutral-500">
              Refresca sesión y caché
            </Text>
          </View>
        </AnimatedPressable>
      </View>

      <View className="px-5 mt-8">
        <View className="mb-4">
          <SectionTitle>Acerca de</SectionTitle>
        </View>
        <View className="flex-row items-center px-4 py-3.5 rounded-lg border border-neutral-800/50 bg-neutral-900/50">
          <Feather name="info" size={16} color="#737373" style={{ marginRight: 12 }} />
          <View className="flex-1">
            <Text className="text-sm text-neutral-300">Versión {appVersion}</Text>
            <Text className="mt-0.5 text-[11px] text-neutral-500">Turcanime</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
