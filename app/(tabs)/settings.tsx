import { ActionRow } from "@/components/ui/ActionRow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ThemedText } from "@/components/ui/ThemedText";
import { ThemedView } from "@/components/ui/ThemedView";
import { Theme } from "@/constants/Theme";
import { useUIStore } from "@/lib/store/uiStore";
import * as Haptics from "expo-haptics";
import React from "react";
import { Alert, StyleSheet, View } from "react-native";
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
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    ]);
  };

  return (
    <ThemedView style={[styles.root, { paddingTop: insets.top + Theme.spacing.lg }]}>
      <ThemedText variant="h2" style={styles.title}>Ajustes</ThemedText>
      
      <View style={styles.section}>
        <SectionTitle>Datos</SectionTitle>
        <ThemedView variant="surface" radius="m" border>
          <ActionRow
            icon="refresh-cw"
            label="Actualizar datos de la app"
            onPress={handleClearCache}
            noBorder
          />
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: Theme.edge.horizontal },
  title: { marginBottom: Theme.spacing.lg },
  section: { marginTop: Theme.spacing.lg },
  sectionTitle: { marginBottom: Theme.spacing.sm },
});


