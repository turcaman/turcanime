import { Image } from "expo-image";
import React, { memo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Theme } from "../../constants/Theme";
import { HistoryItem } from "../../lib/domain/entities";
import { navigateToAnime } from "../../lib/utils/navigation";
import { AnimatedPressable } from "../AnimatedPressable";
import { ThemedText } from "../ui/ThemedText";

interface ContinueWatchingProps {
  items: HistoryItem[];
}

export const ContinueWatching = memo(({ items }: ContinueWatchingProps) => {
  if (!items || items.length === 0) return null;

  const cardWidth = Theme.dimensions.cardPosterMd.width;
  const gap = Theme.component.gapMd;

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <AnimatedPressable
      style={styles.card}
      onPress={() => navigateToAnime(item.url)}
      accessibilityLabel={`Continuar viendo: ${item.title}`}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.overlay}>
        <ThemedText variant="caption" style={styles.episodeLabel}>
          Ep. {item.number}
        </ThemedText>
        <ThemedText color="primary" numberOfLines={1} style={styles.title}>
          {item.title}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );

  return (
    <View style={styles.sectionContainer}>
      <ThemedText variant="h3" style={styles.sectionHeading}>
        Continuar viendo
      </ThemedText>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.url}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionPadding}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        initialNumToRender={3}
        windowSize={5}
        getItemLayout={(data, index) => ({
          length: cardWidth + gap,
          offset: (cardWidth + gap) * index,
          index,
        })}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  sectionContainer: { marginTop: Theme.component.sectionGap },
  sectionHeading: {
    paddingHorizontal: Theme.edge.horizontal,
    marginBottom: Theme.space.compact,
    fontWeight: Theme.fontWeight.bold as "700",
  },
  sectionPadding: { paddingHorizontal: Theme.edge.horizontal },
  card: {
    width: Theme.dimensions.cardPosterMd.width,
    height: Theme.dimensions.cardPosterMd.height,
    marginRight: Theme.component.gapMd,
    borderRadius: Theme.radius.l,
    overflow: "hidden",
    backgroundColor: Theme.colors.surface,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Theme.colors.overlay.dark,
    padding: Theme.component.innerMd,
  },
  episodeLabel: {
    color: Theme.colors.primary,
    fontSize: Theme.fontSize.s,
    fontWeight: Theme.fontWeight.semibold as "600",
    marginBottom: 2,
  },
  title: {
    fontSize: Theme.fontSize.s,
    fontWeight: Theme.fontWeight.semibold,
  },
});

ContinueWatching.displayName = "ContinueWatching";
