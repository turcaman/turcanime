import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Theme } from "../../constants/Theme";
import { Anime } from "../../lib/domain/entities";
import { navigateToAnime } from "../../lib/utils/navigation";
import { AnimatedPressable } from "../AnimatedPressable";
import { ThemedText } from "../ui/ThemedText";
import { ThemedView } from "../ui/ThemedView";

interface HomeHeroProps {
  featured: Anime | undefined;
}

export const HomeHero = memo(({ featured }: HomeHeroProps) => {
  const { width } = useWindowDimensions();
  const HERO_HEIGHT = width * 0.62;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!featured) return null;
  const viewFeatured = () => navigateToAnime(featured.url);

  return (
    <AnimatedPressable
      style={[styles.hero, { height: HERO_HEIGHT }]}
      onPress={viewFeatured}
    >
      <ThemedView
        variant="surface"
        style={StyleSheet.absoluteFill}
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
            key={featured.image}
            source={{ uri: featured.image }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}
      </ThemedView>
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.98)']}
        locations={[0.05, 0.4, 0.75, 1]}
        style={styles.overlay}
      >
        <ThemedText variant="h1" numberOfLines={3} style={styles.title}>
          {featured.title}
        </ThemedText>
      </LinearGradient>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    overflow: "hidden",
    marginBottom: Theme.component.heroBottom,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: Theme.edge.horizontal,
    paddingBottom: Theme.screen.hero.bottomPadding,
  },
  title: {
    color: Theme.colors.text.primary,
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
});

HomeHero.displayName = "HomeHero";


