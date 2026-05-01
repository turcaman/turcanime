import { Image } from "expo-image";
import React, { memo } from "react";
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from "react-native";
import { TAB_BAR_BOTTOM_OFFSET } from "../constants/layout";
import { Theme } from "../constants/Theme";
import { AutocompleteAnime } from "../lib/domain/entities";
import { AnimatedPressable } from "./AnimatedPressable";
import { ThemedText } from "./ui/ThemedText";

interface SuggestionsListProps {
  suggestions: AutocompleteAnime[];
  onSelect: (suggestion: AutocompleteAnime) => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  tabBarOffset?: number;
}

const TMDB_POSTER_BASE = "https://media.themoviedb.org/t/p/w92";

function resolvePoster(poster: string): string {
  if (!poster) return "";
  if (poster.startsWith("http")) return poster;
  return `${TMDB_POSTER_BASE}${poster}`;
}

export const SuggestionsList = memo(({ suggestions, onSelect, onScroll, tabBarOffset }: SuggestionsListProps) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={{ paddingBottom: tabBarOffset ?? TAB_BAR_BOTTOM_OFFSET }}
        onScroll={onScroll}
        scrollEventThrottle={16}
          renderItem={({ item }) => (
            <AnimatedPressable style={styles.row} onPress={() => onSelect(item)}>
              <View style={styles.posterWrap}>
              {item.poster ? (
                <Image
                  source={{ uri: resolvePoster(item.poster) }}
                  style={styles.poster}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : null}
            </View>
            <View style={styles.info}>
              <ThemedText style={styles.title} numberOfLines={1}>
                {item.name}
              </ThemedText>
            </View>
          </AnimatedPressable>
        )}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

SuggestionsList.displayName = "SuggestionsList";

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Theme.colors.background,
    zIndex: 100,
    paddingHorizontal: Theme.edge.horizontal,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Theme.spacing.lg,
    borderBottomWidth: Theme.borders.thin,
    borderBottomColor: Theme.colors.border,
  },
  posterWrap: {
    width: Theme.dimensions.cardPosterSm.width,
    height: Theme.dimensions.cardPosterSm.height,
    borderRadius: Theme.radius.s,
    overflow: "hidden",
    backgroundColor: Theme.colors.surface,
  },
  poster: { flex: 1 },
  info: { marginLeft: Theme.spacing.sm, flex: 1 },
  title: { fontSize: Theme.fontSize.m, fontWeight: Theme.fontWeight.medium as "500" },
});
