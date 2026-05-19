import React, { memo, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { Theme } from "../constants/Theme";
import { Anime, HistoryItem } from "../lib/domain/entities";
import { navigateToAnime } from "../lib/utils/navigation";
import { AnimatedPressable } from "./AnimatedPressable";
import { ImageWithLoader } from "./ui/ImageWithLoader";
import { ThemedText } from "./ui/ThemedText";

interface AnimeCardProps {
  anime: Anime | HistoryItem;
  width: number;
  onPress?: () => void;
  variant?: "default" | "continue";
  episodeNumber?: string;
}

const AnimeCard = ({ anime, width, onPress, variant = "default", episodeNumber }: AnimeCardProps) => {
  const isContinue = variant === "continue";
  const cardHeight = isContinue ? width * Theme.dimensions.ratios.continue : width * Theme.dimensions.ratios.default;

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
      <View style={styles.imageContainer}>
        <ImageWithLoader
          uri={anime.image}
          style={[
            styles.poster,
            { width, height: cardHeight } as import("react-native").ImageStyle
          ]}
        />
        {/* Badge de episodio para modo continue */}
        {isContinue && episodeNumber && (
          <View style={styles.episodeBadge}>
            <ThemedText variant="caption" weight={Theme.fontWeight.bold} color="primary">
              Ep. {episodeNumber}
            </ThemedText>
          </View>
        )}
      </View>
      <ThemedText style={styles.title} numberOfLines={2}>
        {anime.title}
      </ThemedText>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
  },
  poster: {
    borderRadius: Theme.radius.l,
    overflow: "hidden",
    backgroundColor: Theme.colors.surface,
  },
  title: {
    marginTop: Theme.spacing.sm,
    fontSize: Theme.fontSize.m,
    fontWeight: Theme.fontWeight.medium as "500",
  },
  episodeBadge: {
    position: 'absolute',
    bottom: Theme.spacing.sm,
    right: Theme.spacing.sm,
    backgroundColor: Theme.colors.overlay.dark,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.s,
  },
});

export default memo(AnimeCard);
