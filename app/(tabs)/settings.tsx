import { ActionRow } from "@/components/ui/ActionRow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useUIStore } from "@/lib/store/uiStore";
import * as Haptics from "expo-haptics";
import React from "react";
import { Alert, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const handleClearCache = () => {
    Alert.alert("Actualizar datos", "Si el contenido no carga o ves errores, esto renueva la conexión con el servidor para intentar solucionarlo.", [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Actualizar", 
        style: "default", 
        onPress: () => {
          useUIStore.getState().triggerSessionRefresh();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    ]);
  };

  return (
    <View className="flex-1 px-5" style={{ paddingTop: insets.top + 16 }}>
      <Text className="mb-4 text-2xl font-bold text-white">Ajustes</Text>
      
      <View className="mt-4">
        <SectionTitle>Datos</SectionTitle>
        <View className="rounded-lg border border-neutral-800 bg-neutral-900">
          <ActionRow
            icon="refresh-cw"
            label="Actualizar datos de la app"
            onPress={handleClearCache}
            noBorder
          />
        </View>
      </View>
    </View>
  );
}

