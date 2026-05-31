import { ScreenWrapper } from "@/components/ScreenWrapper";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { AnimeDetailsHeader } from "@/components/AnimeDetailsHeader";
import { AnimeEpisodeModal } from "@/components/AnimeEpisodeModal";
import { EpisodeRangeSelector } from "@/components/EpisodeRangeSelector";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
    Text,
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
      <View className="flex-1">
        <ScrollView
          contentContainerStyle={{ paddingBottom: TAB_BAR_BOTTOM_OFFSET }}
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
            toggleSort={() => { void setEpisodeOrder(isAscending ? "desc" : "asc"); }}
            insets={insets}
            onBackPress={navigateBack}
          />

          <EpisodeRangeSelector
            ranges={ranges}
            activeRangeIdx={activeRangeIdx}
            setActiveRangeIdx={setActiveRangeIdx}
            isRestoring={isRestoring}
          />

          <View className="px-5 mt-3 gap-2">
            {visibleEpisodes.map((item) => (
              <AnimatedPressable
                key={item.id}
                onPress={() => { handleEpisodePress(item); }}
              >
                <View className="rounded-lg bg-[#0A0A0A] flex-row items-center justify-between border border-[#1F1F1F] py-4 px-3">
                  <Text className="font-semibold">
                    Episodio {item.number}
                  </Text>
                  <Feather name="play" size={16} color={Theme.colors.primary} />
                </View>
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
            void resolveStream(server, selectedEpisode.url);
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
