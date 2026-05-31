import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Theme } from "../../constants/Theme";
import type { HistoryItem } from "../../lib/domain/entities";
import { navigateToAnime } from "../../lib/utils/navigation";
import { AnimatedPressable } from "../AnimatedPressable";
import { ImageWithLoader } from "../ui/ImageWithLoader";
import { SectionTitle } from "../ui/SectionTitle";
import { ThemedText } from "../ui/ThemedText";

interface ContinueWatchingProps {
  items: HistoryItem[];
}

export const ContinueWatching = memo(({ items }: ContinueWatchingProps) => {
  if (items.length === 0) return null;

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <AnimatedPressable
      style={styles.card}
      onPress={() => { navigateToAnime(item.url); }}
      accessibilityLabel={`Continuar viendo: ${item.title}`}
    >
      <ImageWithLoader
        uri={item.image}
        style={styles.image}
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
      <View style={styles.titleWrapper}>
        <SectionTitle>Continuar viendo</SectionTitle>
      </View>
      <FlashList
        horizontal
        data={items}
        keyExtractor={(item) => item.url}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionPadding}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  sectionContainer: {},
  titleWrapper: {},
  sectionPadding: {},
  card: {
    width: Theme.dimensions.poster.md.width,
    height: Theme.dimensions.poster.md.height,
    marginRight: Theme.spacing.md,
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
    padding: Theme.spacing.sm,
  },
  episodeLabel: {
    color: Theme.colors.primary,
    fontSize: Theme.fontSize.s,
    fontWeight: Theme.fontWeight.semibold as "600",
    marginBottom: 2,
  },
  title: {
    fontSize: Theme.fontSize.m,
    fontWeight: Theme.fontWeight.bold as "700",
  },
});

ContinueWatching.displayName = "ContinueWatching";
