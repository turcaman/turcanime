import AnimeCard from "@/components/AnimeCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RecentSearches } from "@/components/RecentSearches";
import { SuggestionsList } from "@/components/SuggestionsList";
import { AppLoader } from "@/components/ui/AppLoader";

import type { Anime } from "@/lib/domain/entities";
import { useSearchScreen } from "@/lib/hooks/useSearchScreen";
import { useTabBarManager } from "@/lib/hooks/useTabBarManager";
import { TAB_BAR_OFFSET, calcCardWidth } from "@/lib/utils/layout";
import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
    FlatList,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function SearchScreenContent() {
  const {
    searchTerm,
    searchAnimes,
    suggestions,
    recentSearches,
    isLoading,
    isIdle,
    isTyping,
    isSearched,
    handleSearch,
    handleTextChange,
    resetSearch,
    removeRecentSearch,
    handleSelectSuggestion,
  } = useSearchScreen();

  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = calcCardWidth(screenWidth);

  const { handleScroll, reset, showTabBar } = useTabBarManager({ threshold: 8 });

  useEffect(() => {
    if (!isSearched) {
      reset();
      showTabBar();
    }
  }, [isSearched, reset, showTabBar]);

  return (
    <View className="flex-1 bg-black">
      <View
        className="px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center h-12 bg-neutral-900 rounded-xl px-4">
          <Feather
            name="search"
            size={18}
            color={"#a3a3a3"}
            style={{ marginRight: 8 }}
          />
          <TextInput
            className="flex-1 text-white text-base font-normal h-12"
            placeholder="Buscar anime..."
            placeholderTextColor={"#737373"}
            value={searchTerm}
            onChangeText={handleTextChange}
            onSubmitEditing={() => { handleSearch(searchTerm); }}
            returnKeyType="search"
          />
          {searchTerm.length > 0 && (
            <Feather
              name="x"
              size={16}
              color="#a3a3a3"
              onPress={() => {
                resetSearch();
                showTabBar();
              }}
              style={{ padding: 8 }}
            />
          )}
        </View>
      </View>

      <View className="flex-1 bg-black px-5">
        {isIdle && recentSearches.length > 0 && (
          <RecentSearches
            searches={recentSearches}
            onSelect={(term) => { handleSearch(term); }}
            onRemove={removeRecentSearch}
          />
        )}

        {isTyping && suggestions.length > 0 && (
          <SuggestionsList
            suggestions={suggestions}
            onSelect={handleSelectSuggestion}
            onScroll={handleScroll}
            tabBarOffset={TAB_BAR_OFFSET}
          />
        )}

        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <AppLoader variant="small" />
          </View>
        ) : isSearched ? (
          <FlatList
            data={searchAnimes}
            keyExtractor={(item: Anime) => item.url}
            numColumns={3}
            renderItem={({ item }: { item: Anime }) => (
              <View className="mb-2">
                <AnimeCard anime={item} width={cardWidth} />
              </View>
            )}
            columnWrapperClassName="justify-start gap-3"
            contentContainerClassName="pt-4"
            contentContainerStyle={{ paddingBottom: TAB_BAR_OFFSET }}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View className="flex-1 justify-start items-center px-5 pt-20" accessibilityLabel="No se encontraron resultados">
                <Feather
                  name="meh"
            size={40}
            color={"#a3a3a3"}
                />
                <Text className="text-sm text-neutral-500 mt-2">
                  No se encontraron resultados
                </Text>
              </View>
            }
          />
        ) : null}
      </View>
    </View>
  );
}

export default function SearchScreen() {
  return (
    <ErrorBoundary>
      <SearchScreenContent />
    </ErrorBoundary>
  );
}
