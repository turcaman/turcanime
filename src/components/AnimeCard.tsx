import { Image } from "expo-image";
import React, { memo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Theme } from "../constants/Theme";
import { Anime, HistoryItem } from "../lib/domain/entities";
import { navigateToAnime } from "../lib/utils/navigation";
import { AnimatedPressable } from "./AnimatedPressable";
import { ThemedText } from "./ui/ThemedText";
import { ThemedView } from "./ui/ThemedView";

interface AnimeCardProps {
  anime: Anime | HistoryItem;
  width: number;
  onPress?: () => void;
  variant?: "default" | "continue";
  episodeNumber?: string;
}

const AnimeCard = ({ anime, width, onPress, variant = "default", episodeNumber }: AnimeCardProps) => {
  const isContinue = variant === "continue";
  const cardHeight = isContinue ? width * 0.6 : width * 1.5;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handlePress = () => {
    if (!imageError) {
      if (onPress) {
        onPress();
      } else {
        navigateToAnime(anime.url);
      }
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[{ width }]}
      accessibilityLabel={`Anime: ${anime.title}`}
      accessibilityHint="Presiona para ver detalles"
      hapticFeedback={true}
    >
       <ThemedView
         variant="surface"
         radius="l"
         style={[
           styles.poster,
           { width, height: cardHeight },
           !imageLoaded && !imageError && styles.imageLoading,
           imageError && styles.imageError
         ]}
       >
        {!imageLoaded && !imageError && (
          <View style={styles.loadingPlaceholder}>
            <ThemedText variant="caption" color="muted">Cargando...</ThemedText>
          </View>
        )}
        {imageError ? (
          <View style={styles.errorPlaceholder}>
            <ThemedText variant="caption" color="muted">Error</ThemedText>
          </View>
        ) : (
          <Image
            source={{ uri: anime.image }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}
        {/* Badge de episodio para modo continue */}
        {isContinue && episodeNumber && (
          <View style={styles.episodeBadge}>
            <ThemedText variant="caption" weight={Theme.fontWeight.bold} color="primary">
              Ep. {episodeNumber}
            </ThemedText>
          </View>
        )}
       </ThemedView>
      <ThemedText variant="caption" style={styles.title} numberOfLines={2}>
        {anime.title}
      </ThemedText>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  poster: {
    borderRadius: Theme.radius.l,
    overflow: "hidden",
    backgroundColor: Theme.colors.surface,
  },
  title: {
    marginTop: Theme.spacing.sm,
    lineHeight: Theme.lineHeight.s,
  },
  subtitle: {
    marginTop: Theme.spacing.xs,
    lineHeight: Theme.lineHeight.xs,
  },
  imageLoading: {
    backgroundColor: Theme.colors.surface,
  },
  imageError: {
    backgroundColor: Theme.colors.border,
  },
  loadingPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
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
