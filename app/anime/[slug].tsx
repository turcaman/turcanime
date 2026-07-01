import { ScreenWrapper } from "@/components/ScreenWrapper";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { AnimeDetailsHeader } from "@/components/AnimeDetailsHeader";
import { AnimeEpisodeModal } from "@/components/AnimeEpisodeModal";
import { EpisodeRangeSelector } from "@/components/EpisodeRangeSelector";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAnimeDetailScreen } from "@/hooks/useAnimeDetailScreen";
import { navigateBack, navigateToPlayer } from "@/utils/navigation";
import { useHistoryStore } from "@/stores/historyStore";
import { TAB_BAR_OFFSET } from "@/utils/layout";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function AnimeDetailsContent() {
  const { slug } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { addToHistory } = useHistoryStore();
  const {
    anime, isAnimeLoading, error, servers, serverLoading, setEpisodeOrder,
    isExpanded, setIsExpanded, selectedEpisode, setSelectedEpisode,
    hasLoaded, activeRangeIdx, setActiveRangeIdx, isRestoring,
    ranges, visibleEpisodes, isAscending, handleEpisodePress, refresh, resolveStream,
  } = useAnimeDetailScreen(slug as string);

  return (
    <ScreenWrapper error={!!error} hasContent={!!anime} onRetry={refresh}>
      <View className="flex-1 bg-black">
        <ScrollView
          contentContainerStyle={{ paddingBottom: TAB_BAR_OFFSET }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={hasLoaded && isAnimeLoading} onRefresh={refresh} tintColor="#A855F7" />}
        >
          <AnimeDetailsHeader
            anime={anime!}
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
            isAscending={isAscending}
            toggleSort={() => void setEpisodeOrder(isAscending ? "desc" : "asc")}
            insets={insets}
            onBackPress={navigateBack}
          />
          <EpisodeRangeSelector ranges={ranges} activeRangeIdx={activeRangeIdx} setActiveRangeIdx={setActiveRangeIdx} isRestoring={isRestoring} />
          <View style={{ paddingHorizontal: 20, marginTop: 4, gap: 8 }}>
            {visibleEpisodes.map((item) => (
              <AnimatedPressable key={item.id} onPress={() => handleEpisodePress(item)}>
                <View className="rounded-xl bg-neutral-950 flex-row items-center justify-between border border-neutral-800 p-4">
                  <Text className="font-semibold text-white">Episodio {item.number}</Text>
                  <Feather name="play" size={16} color="#A855F7" />
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </ScrollView>

        <AnimeEpisodeModal
          visible={!!selectedEpisode}
          onClose={() => setSelectedEpisode(null)}
          episode={selectedEpisode}
          servers={servers}
          isLoading={serverLoading}
          onServerSelect={(server) => {
            if (selectedEpisode) void resolveStream(server, selectedEpisode.url);
            setSelectedEpisode(null);
            if (selectedEpisode && anime) {
              const existing = useHistoryStore.getState().lastViewed.find(
                (h) => h.url === slug && h.number === selectedEpisode.number,
              );
              addToHistory({
                title: anime.title,
                image: anime.image,
                url: slug as string,
                number: selectedEpisode.number,
                progress: existing?.progress,
                duration: existing?.duration,
                timestamp: Date.now(),
              }).catch(() => {});
              navigateToPlayer({ slug: slug as string, number: selectedEpisode.number, title: anime.title, image: anime.image });
            }
          }}
        />
      </View>
    </ScreenWrapper>
  );
}

export default function AnimeDetails() {
  return (
    <ErrorBoundary>
      <AnimeDetailsContent />
    </ErrorBoundary>
  );
}
