import AnimeCard from "@/components/AnimeCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RecentSearches } from "@/components/RecentSearches";
import { SearchSkeleton } from "@/components/skeletons/SearchSkeleton";
import { SuggestionsList } from "@/components/SuggestionsList";
import type { Anime } from "@/types";
import { useSearchScreen } from "@/hooks/useSearchScreen";
import { useTabBarManager } from "@/hooks/useTabBarManager";
import { TAB_BAR_OFFSET, calcCardWidth } from "@/utils/layout";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const [isFocused, setIsFocused] = useState(false);

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
  /** Show skeleton grid while a search is executing but results haven't arrived yet */
  const showSearchSkeleton = !isSearched && !isIdle && !isTyping && isLoading;

  return (
    <View className="flex-1 bg-black">
      <View className="px-5 pb-4" style={{ paddingTop: insets.top + 16 }}>
        <View className={`flex-row items-center h-12 bg-neutral-900 rounded-xl px-4 transition-all duration-200 ${isFocused ? "ring-1 ring-purple-500/40 bg-neutral-800/80" : "ring-1 ring-neutral-800"}`}>
          <Feather name="search" size={18} color="#a3a3a3" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 text-white text-base font-normal h-12"
            placeholder="Buscar anime..."
            placeholderTextColor="#737373"
            value={searchTerm}
            onChangeText={handleTextChange}
            onSubmitEditing={() => handleSearch(searchTerm)}
            returnKeyType="search"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
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
            <Feather name="search" size={48} color="#404040" />
            <Text className="mt-4 text-sm text-neutral-500">Busca tu anime favorito</Text>
          </View>
        )}
        {isTyping && suggestions.length > 0 && (
          <SuggestionsList suggestions={suggestions} onSelect={handleSelectSuggestion} onScroll={handleScroll} tabBarOffset={TAB_BAR_OFFSET} />
        )}
        {showSearchSkeleton && <SearchSkeleton />}
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
                  <Feather name="frown" size={48} color="#404040" />
                  <Text className="mt-4 text-sm text-neutral-500">Sin resultados para &quot;{searchTerm}&quot;</Text>
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
