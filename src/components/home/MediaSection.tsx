import React, { memo, useMemo } from "react";
import { FlatList, StyleSheet, useWindowDimensions, View } from "react-native";
import { Theme } from "../../constants/Theme";
import { Anime, HistoryItem } from "../../lib/domain/entities";
import AnimeCard from "../AnimeCard";
import { ThemedText } from "../ui/ThemedText";

interface MediaSectionProps<T extends Anime | HistoryItem> {
  label: string;
  items: T[];
  isHistory?: boolean;
}

export const MediaSection = memo(<T extends Anime | HistoryItem>({ label, items, isHistory = false }: MediaSectionProps<T>) => {
  const { width } = useWindowDimensions();

  // Memoize dimensions to avoid recalculations on each render
  const dimensions = useMemo(() => ({
    carousel: width * 0.38,
    continue: width * 0.85,
  }), [width]);

  if (!items || items.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <ThemedText variant="h3" style={styles.sectionHeading}>
        {label}
      </ThemedText>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item, pos) => `${label}-${item.url}-${pos}`}
        renderItem={({ item }) => (
          isHistory
            ? (
               <View style={{ width: dimensions.continue, marginRight: Theme.spacing.md }}>
                <AnimeCard
                  anime={item}
                  width={dimensions.continue}
                  variant="continue"
                  episodeNumber={(item as HistoryItem).number}
                />
               </View>
            )
            : (
               <View style={{ width: dimensions.carousel, marginRight: Theme.spacing.md }}>
                <AnimeCard anime={item} width={dimensions.carousel} />
               </View>
            )
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionPadding}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        initialNumToRender={3}
        windowSize={5}
        getItemLayout={(data, index) => ({
          length: isHistory ? dimensions.continue : dimensions.carousel,
          offset: ((isHistory ? dimensions.continue : dimensions.carousel) + Theme.spacing.md) * index,
          index,
        })}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  sectionContainer: { marginTop: Theme.spacing.xl },
  sectionHeading: {
    paddingHorizontal: Theme.edge.horizontal,
    marginBottom: Theme.spacing.sm,
    fontWeight: Theme.fontWeight.bold,
  },
  sectionPadding: { paddingHorizontal: Theme.edge.horizontal },
});

MediaSection.displayName = "MediaSection";

