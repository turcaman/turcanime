import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { type NativeScrollEvent, type NativeSyntheticEvent, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import type { AutocompleteAnime } from "@/types";
import { TMDB_POSTER_W92 } from "@/config/source";
import { TAB_BAR_OFFSET } from "@/utils/layout";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { ImageWithLoader } from "@/components/ui/ImageWithLoader";

interface SuggestionsListProps {
  suggestions: AutocompleteAnime[];
  searchTerm: string;
  onSelect: (suggestion: AutocompleteAnime) => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  tabBarOffset?: number;
}

function resolvePoster(poster: string): string {
  if (!poster) return "";
  if (poster.startsWith("http")) return poster;
  return `${TMDB_POSTER_W92}${poster}`;
}

function HighlightedTitle({ name, term }: { name: string; term: string }) {
  const query = term.trim().toLowerCase();
  const matchIndex = query.length > 0 ? name.toLowerCase().indexOf(query) : -1;

  if (matchIndex < 0) {
    return (
      <Text className="text-base font-medium text-white" numberOfLines={1}>
        {name}
      </Text>
    );
  }

  return (
    <Text className="text-base font-medium" numberOfLines={1}>
      <Text className="text-neutral-400">{name.slice(0, matchIndex)}</Text>
      <Text className="font-semibold text-white">
        {name.slice(matchIndex, matchIndex + query.length)}
      </Text>
      <Text className="text-neutral-400">{name.slice(matchIndex + query.length)}</Text>
    </Text>
  );
}

export const SuggestionsList = memo(({ suggestions, searchTerm, onSelect, onScroll, tabBarOffset }: SuggestionsListProps) => {
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
          <AnimatedPressable className="flex-row items-center border-b border-neutral-800 py-3" onPress={() => { onSelect(item); }}>
            <View className="h-20 w-14 overflow-hidden rounded bg-neutral-800 border border-neutral-800/60">
              {item.poster ? (
                <ImageWithLoader
                  uri={resolvePoster(item.poster)}
                  style={{ flex: 1 }}
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Feather name="film" size={14} color="#525252" />
                </View>
              )}
            </View>
            <View className="ml-2 flex-1">
              <HighlightedTitle name={item.name} term={searchTerm} />
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
