import React, { memo, useCallback } from "react";
import { View, Text } from "react-native";
import type { Anime, HistoryItem } from "../lib/domain/entities";
import { navigateToAnime } from "../lib/utils/navigation";
import { AnimatedPressable } from "./AnimatedPressable";
import { ImageWithLoader } from "./ui/ImageWithLoader";

interface AnimeCardProps {
  anime: Anime | HistoryItem;
  width: number;
  onPress?: () => void;
  variant?: "default" | "continue";
  episodeNumber?: string;
}

const AnimeCard = ({ anime, width, onPress, variant = "default", episodeNumber }: AnimeCardProps) => {
  const isContinue = variant === "continue";
  const cardHeight = isContinue ? width * 0.56 : width * 1.4;

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      navigateToAnime(anime.url);
    }
  }, [onPress, anime.url]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[{ width }]}
      accessibilityLabel={`Anime: ${anime.title}`}
      accessibilityHint="Presiona para ver detalles"
      hapticFeedback={true}
    >
      <View className="relative">
        <ImageWithLoader
          uri={anime.image}
          style={[{ width, height: cardHeight } as import("react-native").ImageStyle]}
        />
        {isContinue && episodeNumber != null && episodeNumber !== '' && (
          <View className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1">
            <Text className="text-[10px] font-bold tracking-wide text-purple-500">
              Ep. {episodeNumber}
            </Text>
          </View>
        )}
      </View>
      <Text className="mt-2 text-sm font-medium text-white" numberOfLines={2}>
        {anime.title}
      </Text>
    </AnimatedPressable>
  );
};

export default memo(AnimeCard);
