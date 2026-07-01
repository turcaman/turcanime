import AnimeCard from "@/components/AnimeCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RecentSearches } from "@/components/RecentSearches";
import { SuggestionsList } from "@/components/SuggestionsList";
import type { Anime } from "@/types";
import { useSearchScreen } from "@/hooks/useSearchScreen";
import { useTabBarManager } from "@/hooks/useTabBarManager";
import { TAB_BAR_OFFSET, calcCardWidth } from "@/utils/layout";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef } from "react";
import { Animated, FlatList, RefreshControl, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function SearchScreenContent() {
  const {
    searchTerm, searchAnimes, suggestions, recentSearches, isLoading,
    isIdle, isTyping, isSearched, handleSearch, handleTextChange, resetSearch,
    retrySearch, removeRecentSearch, clearRecentSearches, handleSelectSuggestion,
  } = useSearchScreen();

  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = calcCardWidth(screenWidth);
  const { handleScroll, reset, showTabBar } = useTabBarManager({ threshold: 8 });
  const resultsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isSearched) { reset(); showTabBar(); }
  }, [isSearched, reset, showTabBar]);

  useEffect(() => {
    Animated.timing(resultsOpacity, { toValue: isSearched ? 1 : 0, duration: 150, useNativeDriver: true }).start();
  }, [isSearched, resultsOpacity]);

  const renderSearchResult = useCallback(({ item }: { item: Anime }) => (
    <View className="mb-2"><AnimeCard anime={item} width={cardWidth} /></View>
  ), [cardWidth]);

  const showIdleContent = isIdle && !isTyping && !isSearched && !isLoading;
  const showHint = showIdleContent && recentSearches.length === 0;

  return (
    <View className="flex-1 bg-black">
      <View className="px-5 pb-4" style={{ paddingTop: insets.top + 16 }}>
        <View className="flex-row items-center h-12 bg-neutral-900 rounded-xl border border-neutral-800 px-4">
          <Feather name="search" size={18} color="#a3a3a3" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 text-white text-base font-normal h-12"
            placeholder="Buscar anime..."
            placeholderTextColor="#737373"
            value={searchTerm}
            onChangeText={handleTextChange}
            onSubmitEditing={() => handleSearch(searchTerm)}
            returnKeyType="search"
          />
          {searchTerm.length > 0 && (
            <Feather name="x" size={16} color="#a3a3a3"
              onPress={() => { resetSearch(); showTabBar(); }}
              style={{ padding: 8 }}
            />
          )}
        </View>
      </View>

      <View className="flex-1 bg-black px-5">
        {showIdleContent && recentSearches.length > 0 && (
          <RecentSearches searches={recentSearches} onSelect={(t) => handleSearch(t)} onRemove={removeRecentSearch} onClearAll={clearRecentSearches} />
        )}
        {showHint && (
          <View className="flex-1 justify-start items-center pt-20">
            <Text className="text-sm text-neutral-500 text-center leading-6">{"Ej: One Piece, Attack on Titan,\nDemon Slayer..."}</Text>
          </View>
        )}
        {isTyping && suggestions.length > 0 && (
          <SuggestionsList suggestions={suggestions} onSelect={handleSelectSuggestion} onScroll={handleScroll} tabBarOffset={TAB_BAR_OFFSET} />
        )}
        {isSearched && (
          <Animated.View style={{ flex: 1, opacity: resultsOpacity }}>
            <FlatList
              data={searchAnimes}
              keyExtractor={(item: Anime) => item.url}
              numColumns={3}
              renderItem={renderSearchResult}
              columnWrapperClassName="justify-start gap-3"
              contentContainerClassName="pt-4"
              contentContainerStyle={{ paddingBottom: TAB_BAR_OFFSET }}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              refreshControl={<RefreshControl refreshing={isLoading} onRefresh={retrySearch} tintColor="#A855F7" />}
              ListEmptyComponent={!isLoading ? (
                <View className="flex-1 justify-start items-center px-5 pt-20">
                  <Feather name="search" size={40} color="#a3a3a3" />
                  <Text className="text-sm text-neutral-500 mt-2">No se encontraron resultados</Text>
                </View>
              ) : null}
            />
          </Animated.View>
        )}
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
