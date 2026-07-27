import { ScreenWrapper } from "@/components/ScreenWrapper";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { AnimeDetailsHeader } from "@/components/AnimeDetailsHeader";
import { AnimeEpisodeModal } from "@/components/AnimeEpisodeModal";
import { EpisodeRangeSelector } from "@/components/EpisodeRangeSelector";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DetailSkeleton } from "@/components/skeletons/DetailSkeleton";
import { useAnimeDetailScreen } from "@/hooks/useAnimeDetailScreen";
import { navigateBack } from "@/utils/navigation";
import { useHistoryStore } from "@/stores/historyStore";
import { findHistoryEntry } from "@/utils/history";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { calcProgress } from "@/utils/math";
import { TAB_BAR_OFFSET } from "@/utils/layout";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { ACCENT_COLOR } from "@/config/source";
import { memo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { useCrossfade } from "@/hooks/useCrossfade";

const AnimeDetailsContent = memo(function AnimeDetailsContent() {
  const { slug } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const {
    anime, isAnimeLoading, error, servers, serverLoading, setEpisodeOrder,
    isExpanded, setIsExpanded, selectedEpisode, setSelectedEpisode,
    hasLoaded, activeRangeIdx, setActiveRangeIdx, isRestoring,
    ranges, visibleEpisodes, isAscending, handleEpisodePress, handleServerSelect, refresh,
  } = useAnimeDetailScreen(slug as string);

  const showContent = anime != null && anime.url === slug;

  const { keepSkeleton, skeletonStyle, contentStyle } = useCrossfade(showContent);

  if (!anime && error) {
    return (
      <ScreenWrapper error={!!error} hasContent={false} onRetry={refresh}>
        <View className="flex-1 bg-black" />
      </ScreenWrapper>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {showContent && (
        <Animated.View style={[{ flex: 1 }, contentStyle]}>
          <ScreenWrapper error={!!error} hasContent={!!anime} onRetry={refresh}>
            <View className="flex-1 bg-black">
              <ScrollView
                contentContainerStyle={{ paddingBottom: TAB_BAR_OFFSET }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={hasLoaded && isAnimeLoading} onRefresh={refresh} tintColor={ACCENT_COLOR} />}
              >
                <AnimeDetailsHeader
                  anime={anime!}
                  relations={anime?.relations ?? null}
                  isExpanded={isExpanded}
                  setIsExpanded={setIsExpanded}
                  isAscending={isAscending}
                  toggleSort={() => void setEpisodeOrder(isAscending ? "desc" : "asc")}
                  insets={insets}
                  onBackPress={navigateBack}
                />
                <EpisodeRangeSelector ranges={ranges} activeRangeIdx={activeRangeIdx} setActiveRangeIdx={setActiveRangeIdx} isRestoring={isRestoring} />
                <View style={{ paddingHorizontal: 20, marginTop: 4, gap: 12 }}>
                  {visibleEpisodes.map((item) => {
                    const historyEntry = findHistoryEntry(useHistoryStore.getState().lastViewed, slug as string, item.number);
                    const hasProgress = historyEntry != null && (historyEntry.progress ?? 0) > 0 && (historyEntry.duration ?? 0) > 0;
                    const pct = hasProgress ? calcProgress(historyEntry.progress, historyEntry.duration) : 0;
                    const barProgress = hasProgress && pct >= 0.9 ? historyEntry!.duration : historyEntry?.progress;

                    return (
                      <AnimatedPressable key={item.id} onPress={() => handleEpisodePress(item)}>
                        <View className="rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden">
                          <View className="flex-row items-center justify-between p-4">
                            <Text className="font-semibold text-white">Episodio {item.number}</Text>
                            <Feather name="play" size={16} color={ACCENT_COLOR} />
                          </View>
                          {hasProgress && (
                            <ProgressBar progress={barProgress} duration={historyEntry.duration} />
                          )}
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </ScrollView>

              <AnimeEpisodeModal
                visible={!!selectedEpisode}
                onClose={() => setSelectedEpisode(null)}
                episode={selectedEpisode}
                servers={servers}
                isLoading={serverLoading}
                onServerSelect={handleServerSelect}
              />
            </View>
          </ScreenWrapper>
        </Animated.View>
      )}
      {(keepSkeleton || !showContent) && (
        <Animated.View style={[StyleSheet.absoluteFill, skeletonStyle]}>
          <DetailSkeleton />
        </Animated.View>
      )}
    </View>
  );
});

export default function AnimeDetails() {
  return (
    <ErrorBoundary>
      <AnimeDetailsContent />
    </ErrorBoundary>
  );
}
