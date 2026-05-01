import { AnimatedPressable } from "@/components/AnimatedPressable";
import { AnimeDetailsHeader } from "@/components/AnimeDetailsHeader";
import { AnimeEpisodeModal } from "@/components/AnimeEpisodeModal";
import { EpisodeRangeSelector } from "@/components/EpisodeRangeSelector";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLoader } from "@/components/ui/AppLoader";
import { ErrorState } from "@/components/ui/ErrorState";
import { ThemedText } from "@/components/ui/ThemedText";
import { ThemedView } from "@/components/ui/ThemedView";
import { TAB_BAR_BOTTOM_OFFSET } from "@/constants/layout";
import { Theme } from "@/constants/Theme";
import { useAnimeDetailScreen } from "@/lib/hooks/useAnimeDetailScreen";
import { navigateToPlayer } from "@/lib/utils/navigation";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function AnimeDetailsContent() {
  const { slug } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const {
    anime,
    isAnimeLoading,
    error,
    servers,
    serverLoading,
    setEpisodeOrder,
    isExpanded,
    setIsExpanded,
    selectedEpisode,
    setSelectedEpisode,
    hasLoaded,
    activeRangeIdx,
    setActiveRangeIdx,
    isRestoring,
    ranges,
    visibleEpisodes,
    isAscending,
    handleEpisodePress,
    refresh,
    resolveStream,
  } = useAnimeDetailScreen(slug as string);

  if (isAnimeLoading) {
    return (
      <ThemedView style={styles.root}>
        <AppLoader variant="full" />
      </ThemedView>
    );
  }

  if (!anime && error) {
    return (
      <ThemedView style={styles.root}>
        <ErrorState onRetry={refresh} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={hasLoaded && isAnimeLoading}
            onRefresh={refresh}
            tintColor={Theme.colors.primary}
          />
        }
      >
        <AnimeDetailsHeader
          anime={anime}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          isAscending={isAscending}
          toggleSort={() => setEpisodeOrder(isAscending ? "desc" : "asc")}
          insets={insets}
        />

        {/* Episode Range Selector - above episode list */}
        <EpisodeRangeSelector
          ranges={ranges}
          activeRangeIdx={activeRangeIdx}
          setActiveRangeIdx={setActiveRangeIdx}
          isRestoring={isRestoring}
        />

        <View style={styles.episodeList}>
          {visibleEpisodes.map((item) => (
            <AnimatedPressable
              key={item.id}
              onPress={() => handleEpisodePress(item)}
            >
              <ThemedView
                variant="surface"
                padding="md"
                radius="m"
                border
                style={styles.episodeCardInner}
              >
                <ThemedText variant="body" style={styles.episodeText}>
                  Episodio {item.number}
                </ThemedText>
                <Feather name="play" size={16} color={Theme.colors.primary} />
              </ThemedView>
            </AnimatedPressable>
          ))}
        </View>
      </ScrollView>

      <AnimeEpisodeModal
        visible={!!selectedEpisode}
        onClose={() => {
          setSelectedEpisode(null);
        }}
        episode={selectedEpisode}
        servers={servers}
        isLoading={serverLoading}
        onServerSelect={(server) => {
          resolveStream(server);
          setSelectedEpisode(null);
          if (selectedEpisode && anime) {
            navigateToPlayer({
              slug: slug as string,
              number: selectedEpisode.number,
              title: anime.title,
              img: anime.image,
            });
          }
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: TAB_BAR_BOTTOM_OFFSET },
  episodeList: {
    paddingHorizontal: Theme.edge.horizontal,
    marginTop: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  episodeCardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
  },
  episodeText: {
    fontWeight: Theme.fontWeight.semibold,
  },
});

export default function AnimeDetails() {
  return (
    <ErrorBoundary>
      <AnimeDetailsContent />
    </ErrorBoundary>
  );
}
