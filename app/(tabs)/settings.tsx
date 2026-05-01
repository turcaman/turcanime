import { ThemedText } from "@/components/ui/ThemedText";
import { ThemedView } from "@/components/ui/ThemedView";
import { Theme } from "@/constants/Theme";
import { clearAllCache } from "@/lib/application/services/playerService";
import { useUserStore } from "@/lib/store/userStore";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { clearHistory } = useUserStore();
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleClearCache = () => {
    Alert.alert(
      "Limpiar caché",
      "¿Eliminar todos los datos de episodios y streams guardados?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpiar",
          style: "destructive",
          onPress: async () => {
            await clearAllCache();
            setCacheCleared(true);
            setTimeout(() => setCacheCleared(false), 2000);
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Limpiar historial",
      "¿Eliminar todo tu historial de visualización?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => clearHistory(),
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Theme.spacing.lg,
          paddingBottom: Theme.spacing.xxxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText variant="h1" style={styles.header}>
          Ajustes
        </ThemedText>

        <View style={styles.section}>
          <ThemedText variant="caption" color="muted" style={styles.sectionTitle}>
            Almacenamiento
          </ThemedText>
          <View style={styles.card}>
            <SettingItem
              icon="trash-2"
              iconColor="#FF3B30"
              title="Limpiar caché"
              subtitle={cacheCleared ? "✓ Caché limpiado" : undefined}
              onPress={handleClearCache}
            />
            <View style={styles.separator} />
            <SettingItem
              icon="clock"
              iconColor="#FF9500"
              title="Limpiar historial"
              onPress={handleClearHistory}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText variant="caption" color="muted" style={styles.sectionTitle}>
            Acerca de
          </ThemedText>
          <View style={styles.card}>
            <SettingItem
              icon="info"
              iconColor="#007AFF"
              title="Versión"
              value="1.7.4"
            />
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

interface SettingItemProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

function SettingItem({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onPress,
  showChevron,
}: SettingItemProps) {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
        <Feather name={icon} size={18} color="#FFFFFF" />
      </View>
      <View style={styles.content}>
        <ThemedText variant="body">{title}</ThemedText>
        {subtitle && (
          <ThemedText variant="caption" color="muted">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {value && (
        <ThemedText variant="body" color="muted" style={styles.value}>
          {value}
        </ThemedText>
      )}
      {showChevron && (
        <Feather name="chevron-right" size={20} color={Theme.colors.text.muted} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.l,
    marginHorizontal: Theme.spacing.lg,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  value: {
    marginRight: Theme.spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginLeft: 56,
  },
});
