import { ScreenWrapper } from "@/components/ScreenWrapper";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { AnimeDetailsHeader } from "@/components/AnimeDetailsHeader";
import { AnimeEpisodeModal } from "@/components/AnimeEpisodeModal";
import { EpisodeRangeSelector } from "@/components/EpisodeRangeSelector";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemedText } from "@/components/ui/ThemedText";
import { ThemedView } from "@/components/ui/ThemedView";
import { TAB_BAR_BOTTOM_OFFSET } from "@/constants/layout";
import { Theme } from "@/constants/Theme";
import { useAnimeDetailScreen } from "@/lib/hooks/useAnimeDetailScreen";
import { navigateBack, navigateToPlayer } from "@/lib/utils/navigation";
import { useHistoryStore } from "@/lib/store/user";
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
  const { addToHistory } = useHistoryStore();
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

  return (
    <ScreenWrapper
      isLoading={isAnimeLoading && !anime}
      error={!!error}
      hasContent={!!anime}
      onRetry={refresh}
    >
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
            anime={anime!}
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
            isAscending={isAscending}
            toggleSort={() => setEpisodeOrder(isAscending ? "desc" : "asc")}
            insets={insets}
            onBackPress={navigateBack}
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
          if (selectedEpisode) {
            resolveStream(server, selectedEpisode.url);
          }
          setSelectedEpisode(null);
          if (selectedEpisode && anime) {
              addToHistory({
                title: anime.title,
                image: anime.image,
                url: slug as string,
                number: selectedEpisode.number,
                timestamp: Date.now(),
              }).catch(() => {});
              navigateToPlayer({
                slug: slug as string,
                number: selectedEpisode.number,
                title: anime.title,
                image: anime.image,
              });
            }
          }}
        />
      </ThemedView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: TAB_BAR_BOTTOM_OFFSET },
  episodeList: {
    paddingHorizontal: Theme.edge.horizontal,
    marginTop: Theme.spacing.md,
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
