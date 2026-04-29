import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Theme } from "../constants/Theme";
import { Episode, VideoServer } from "../lib/domain/entities";
import { AnimatedPressable } from "./AnimatedPressable";
import { AppLoader } from "./ui/AppLoader";
import { ThemedText } from "./ui/ThemedText";

interface AnimeEpisodeModalProps {
  visible: boolean;
  onClose: () => void;
  episode: Episode | null;
  servers: VideoServer[];
  isLoading: boolean;
  onServerSelect: (server: VideoServer) => void;
}

const mapLanguage = (lang: string) => {
  const code = (lang || "").toUpperCase();
  if (code.includes("SUB")) return "Subtitulado";
  if (code.includes("LAT")) return "Latino";
  if (code.includes("CAS")) return "Castellano";
  return lang || "Desconocido";
};

export const AnimeEpisodeModal = ({
  visible, onClose, episode, servers, isLoading, onServerSelect
}: AnimeEpisodeModalProps) => {
  if (!visible) return null;

  // Prefer delta servers (AnimeLatinoHD), fallback to all
  const delta = servers.filter((s) => s.title?.toLowerCase().includes("delta"));
  const displayServers = delta.length > 0 ? delta : servers;

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <View style={styles.content}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <ThemedText variant="h2">Episodio {episode?.number}</ThemedText>
          <Feather name="x" size={20} color={Theme.colors.text.secondary} onPress={onClose} />
        </View>

        <ThemedText variant="caption" color="muted" style={styles.subtitle}>
          Selecciona un idioma
        </ThemedText>

        <View style={styles.serverList}>
          {isLoading ? (
            <AppLoader variant="small" />
          ) : displayServers.length === 0 ? (
            <View style={styles.loaderArea}>
              <ThemedText variant="caption" color="muted">No hay servidor disponible</ThemedText>
            </View>
          ) : (
            displayServers.map((server) => (
              <AnimatedPressable
                key={server.url}
                style={styles.serverCard}
                onPress={() => onServerSelect(server)}
              >
                <View style={styles.playIcon}>
                  <Feather name="play" size={14} color={Theme.colors.primary} />
                </View>
                <ThemedText weight={Theme.fontWeight.bold} style={styles.langText}>
                  {mapLanguage(server.language)}
                </ThemedText>
              </AnimatedPressable>
            ))
          )}
        </View>
      </View>
    </View>
  );
};

AnimeEpisodeModal.displayName = "AnimeEpisodeModal";

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Theme.colors.overlay.heavy,
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: Theme.radius.l,
    borderTopRightRadius: Theme.radius.l,
    paddingHorizontal: Theme.space.generous,
    paddingTop: Theme.component.gapSm,
    paddingBottom: Theme.space.section + Theme.space.generous,  // 24 + 20 = 44, safe area for system nav bar
  },
  handle: {
    width: Theme.dimensions.modalHandle.width,
    height: Theme.dimensions.modalHandle.height,
    borderRadius: Theme.dimensions.modalHandle.radius,
    backgroundColor: Theme.colors.border,
    alignSelf: "center",
    marginBottom: Theme.component.gapSm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Theme.component.gapSm,
  },
  subtitle: { marginBottom: Theme.component.gapSm },
  serverList: { gap: Theme.component.gapSm },
  serverCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.colors.background,
    padding: Theme.space.comfortable,
    borderRadius: Theme.radius.m,
  },
  playIcon: {
    width: Theme.dimensions.playIcon.width,
    height: Theme.dimensions.playIcon.height,
    borderRadius: Theme.radius.s,
    backgroundColor: Theme.colors.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Theme.component.gapSm,
  },
  langText: {
    flex: 1,
  },
  loaderArea: { height: Theme.dimensions.loaderHeight, justifyContent: "center", alignItems: "center" },
});
