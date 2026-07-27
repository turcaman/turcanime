import { ContinueWatching } from "@/components/home/ContinueWatching";
import { AnimeGridSection } from "@/components/home/AnimeGridSection";
import { ErrorState } from "@/components/ui/ErrorState";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HomeSkeleton } from "@/components/skeletons/HomeSkeleton";
import { useHomeScreen, type SectionItem } from "@/hooks/useHomeScreen";
import { useTabBarManager } from "@/hooks/useTabBarManager";
import { TAB_BAR_OFFSET } from "@/utils/layout";
import { ACCENT_COLOR } from "@/config/source";
import React, { useEffect } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { useCrossfade } from "@/hooks/useCrossfade";

const HomeContent = React.memo(function HomeContent() {
  const { sections, isLoading, error, fetchHome, hasContent } = useHomeScreen();
  const { handleScroll, reset } = useTabBarManager({ threshold: 8 });
  const insets = useSafeAreaInsets();

  const { keepSkeleton, skeletonStyle, contentStyle } = useCrossfade(hasContent);

  useEffect(() => {
    void fetchHome();
    reset();
  }, [fetchHome, reset]);

  if (!hasContent && error) {
    return <ErrorState onRetry={() => void fetchHome(true)} />;
  }

  return (
    <View className="flex-1 bg-black">
      {hasContent && (
        <Animated.View style={[{ flex: 1 }, contentStyle]}>
          <FlatList
            data={sections}
            keyExtractor={(item: SectionItem, index: number) => `${item.type}-${index}`}
            renderItem={({ item }) => {
              if (item.type === "CONTINUE") return <ContinueWatching items={item.items} />;
              return <AnimeGridSection label={item.label} items={item.items} />;
            }}
            ItemSeparatorComponent={() => <View className="h-4" />}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: insets.top + 16,
              paddingBottom: TAB_BAR_OFFSET + insets.bottom,
            }}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void fetchHome(true)} tintColor={ACCENT_COLOR} />}
          />
        </Animated.View>
      )}
      {(keepSkeleton || !hasContent) && (
        <Animated.View style={[StyleSheet.absoluteFill, skeletonStyle]}>
          <HomeSkeleton />
        </Animated.View>
      )}
    </View>
  );
});

export default function Home() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
  );
}
