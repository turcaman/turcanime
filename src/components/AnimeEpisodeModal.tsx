import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import type { Episode, VideoServer } from "../lib/domain/entities";
import { AnimatedPressable } from "./AnimatedPressable";
import { AppLoader } from "./ui/AppLoader";

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

  return (
    <View className="absolute inset-0 bg-black/80 justify-end">
      <Pressable className="absolute inset-0" onPress={onClose} />

      <View className="bg-neutral-900 rounded-t-2xl px-5 pt-2 pb-11">
        <View className="w-9 h-1 rounded-full bg-neutral-800 self-center mb-2" />

        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-white text-xl font-bold">Episodio {episode?.number}</Text>
          <Feather name="x" size={20} color="#a3a3a3" onPress={onClose} />
        </View>

        <Text className="text-neutral-400 text-xs mb-2">
          Selecciona un idioma
        </Text>

        <View className="gap-2">
          {isLoading ? (
            <AppLoader variant="small" />
          ) : servers.length === 0 ? (
            <View className="h-48 justify-center items-center">
              <Text className="text-neutral-400 text-xs">No hay servidor disponible</Text>
            </View>
          ) : (
            servers.map((server, index) => (
              <AnimatedPressable
                key={server.id || `server-${index}`}
                className="flex-row items-center bg-black p-4 rounded-xl"
                onPress={() => { onServerSelect(server); }}
              >
                <View className="w-7 h-7 rounded-lg bg-purple-500/15 justify-center items-center mr-2">
                  <Feather name="play" size={14} color="#A855F7" />
                </View>
                <Text className="text-white font-bold flex-1">
                  {mapLanguage(server.language)}
                </Text>
              </AnimatedPressable>
            ))
          )}
        </View>
      </View>
    </View>
  );
};

AnimeEpisodeModal.displayName = "AnimeEpisodeModal";
