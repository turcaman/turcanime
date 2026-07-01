import React, { memo } from "react";
import { type NativeScrollEvent, type NativeSyntheticEvent, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import type { AutocompleteAnime } from "../types";
import { TMDB_POSTER_W92 } from "../config/animeLatino";
import { TAB_BAR_OFFSET } from "../utils/layout";
import { AnimatedPressable } from "./AnimatedPressable";
import { ImageWithLoader } from "./ui/ImageWithLoader";

interface SuggestionsListProps {
  suggestions: AutocompleteAnime[];
  onSelect: (suggestion: AutocompleteAnime) => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  tabBarOffset?: number;
}

function resolvePoster(poster: string): string {
  if (!poster) return "";
  if (poster.startsWith("http")) return poster;
  return `${TMDB_POSTER_W92}${poster}`;
}

export const SuggestionsList = memo(({ suggestions, onSelect, onScroll, tabBarOffset }: SuggestionsListProps) => {
  if (suggestions.length === 0) return null;

  return (
    <View className="flex-1">
      <FlashList
        data={suggestions}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={{ paddingBottom: tabBarOffset ?? TAB_BAR_OFFSET }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <AnimatedPressable className="flex-row items-center border-b border-neutral-800 py-4" onPress={() => { onSelect(item); }}>
            <View className="h-20 w-14 overflow-hidden rounded bg-neutral-900">
              {item.poster ? (
                <ImageWithLoader
                  uri={resolvePoster(item.poster)}
                  style={{ flex: 1 }}
                />
              ) : null}
            </View>
            <View className="ml-2 flex-1">
              <Text className="text-base font-medium text-white" numberOfLines={1}>
                {item.name}
              </Text>
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
