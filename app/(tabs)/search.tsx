import AnimeCard from "@/components/AnimeCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RecentSearches } from "@/components/RecentSearches";
import { SuggestionsList } from "@/components/SuggestionsList";
import { AppLoader } from "@/components/ui/AppLoader";
import { ThemedText } from "@/components/ui/ThemedText";
import { ThemedView } from "@/components/ui/ThemedView";
import {
    GridConfig,
    searchGridCardWidth,
    TAB_BAR_BOTTOM_OFFSET,
} from "@/constants/layout";
import { Theme } from "@/constants/Theme";
import { Anime } from "@/lib/domain/entities";
import { useSearchScreen } from "@/lib/hooks/useSearchScreen";
import { useTabBarManager } from "@/lib/hooks/useTabBarManager";
import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
    FlatList,
    StyleSheet,
    TextInput
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
  const cardWidth = searchGridCardWidth();

  const { handleScroll, reset, showTabBar } = useTabBarManager({ threshold: 8 });

  // Reset scroll and show tabbar when search ends
  useEffect(() => {
    if (!isSearched) {
      reset();
      showTabBar();
    }
  }, [isSearched, reset, showTabBar]);

  return (
    <ThemedView style={styles.root}>
      <ThemedView
        style={[
          styles.searchBarContainer,
          { paddingTop: insets.top + Theme.spacing.lg },
        ]}
      >
        <ThemedView style={styles.searchBar}>
          <Feather
            name="search"
            size={18}
            color={Theme.colors.text.muted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Buscar anime..."
            placeholderTextColor={Theme.colors.text.muted}
            value={searchTerm}
            onChangeText={handleTextChange}
            onSubmitEditing={() => handleSearch(searchTerm)}
            returnKeyType="search"
          />
          {searchTerm.length > 0 && (
            <Feather
              name="x"
              size={16}
              color={Theme.colors.text.secondary}
              onPress={() => {
                resetSearch();
                showTabBar();
              }}
              style={styles.clearIcon}
            />
          )}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.content}>
        {/* Estado 1: Vacío → Recientes si existen */}
        {isIdle && recentSearches.length > 0 && (
          <RecentSearches
            searches={recentSearches}
            onSelect={handleSearch}
            onRemove={removeRecentSearch}
          />
        )}

        {/* Estado 2: Escribiendo → Suggestions */}
        {isTyping && suggestions.length > 0 && (
          <SuggestionsList
            suggestions={suggestions}
            onSelect={handleSelectSuggestion}
            onScroll={handleScroll}
            tabBarOffset={TAB_BAR_BOTTOM_OFFSET}
          />
        )}

        {/* Estado 3: Buscando / Buscado → Loader o Resultados */}
        {isLoading ? (
          <ThemedView style={styles.centeredContent}>
            <AppLoader variant="small" />
          </ThemedView>
        ) : isSearched ? (
          <FlatList
            data={searchAnimes}
            keyExtractor={(item: Anime) => item.url}
            numColumns={3}
            renderItem={({ item }: { item: Anime }) => (
              <ThemedView style={styles.cardWrapper}>
                <AnimeCard anime={item} width={cardWidth} />
              </ThemedView>
            )}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <ThemedView style={styles.emptyContainer} accessibilityLabel="No se encontraron resultados">
                <Feather
                  name="meh"
                  size={40}
                  color={Theme.colors.text.muted}
                />
                <ThemedText variant="body" color="muted" style={styles.emptyTitle}>
                  No se encontraron resultados
                </ThemedText>
              </ThemedView>
            }
          />
        ) : null}
      </ThemedView>
    </ThemedView>
  );
}

export default function SearchScreen() {
  return (
    <ErrorBoundary>
      <SearchScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchBarContainer: {
    paddingHorizontal: Theme.edge.horizontal,
    paddingBottom: Theme.spacing.lg,
    backgroundColor: Theme.colors.background,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: Theme.dimensions.input.height,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.m,
    paddingHorizontal: Theme.spacing.lg,
  },
  searchIcon: { marginRight: Theme.spacing.sm },
  clearIcon: { padding: Theme.spacing.sm },
  input: {
    flex: 1,
    color: Theme.colors.text.primary,
    fontSize: Theme.fontSize.m,
    fontWeight: Theme.fontWeight.medium as "500",
    height: Theme.dimensions.input.height,
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.edge.horizontal,
  },
  listContent: {
    paddingBottom: TAB_BAR_BOTTOM_OFFSET,
    paddingTop: Theme.spacing.lg,
  },
  columnWrapper: {
    justifyContent: "flex-start",
    gap: GridConfig.search.gaps.column,
  },
  cardWrapper: { marginBottom: GridConfig.search.gaps.row },
  emptyContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xxxxl + Theme.spacing.xxl,
  },
  emptyTitle: {
    marginTop: Theme.spacing.sm,
  },
});

