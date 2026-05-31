import { ContinueWatching } from "@/components/home/ContinueWatching";
import { AnimeGridSection } from "@/components/home/AnimeGridSection";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TAB_BAR_BOTTOM_OFFSET } from "@/constants/layout";
import { Theme } from "@/constants/Theme";
import { type SectionItem, useHomeScreen } from "@/lib/hooks/useHomeScreen";
import { useTabBarManager } from "@/lib/hooks/useTabBarManager";
import React, { useEffect } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HomeContent = React.memo(function HomeContent() {
  const { sections, isLoading, error, fetchHome, hasContent } = useHomeScreen();
  const { handleScroll, reset } = useTabBarManager({ threshold: 8 });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void fetchHome();
    reset();
  }, [fetchHome, reset]);

  const renderItem = ({ item }: { item: SectionItem }) => {
    if (item.type === "CONTINUE") {
      return <ContinueWatching items={item.items} />;
    }
    return (
      <AnimeGridSection
        label={item.label}
        items={item.items}
      />
    );
  };

  return (
    <ScreenWrapper
      isLoading={isLoading}
      error={!!error}
      hasContent={hasContent}
      onRetry={() => { void fetchHome(true); }}
    >
      <View className="flex-1">
        <FlatList
          data={sections}
          keyExtractor={(item: SectionItem, index: number) => `${item.type}-${index}`}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: Theme.spacing.xl }} />}
          contentContainerStyle={{ paddingHorizontal: Theme.edge.horizontal, paddingTop: insets.top + Theme.spacing.lg, paddingBottom: TAB_BAR_BOTTOM_OFFSET + insets.bottom }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={null}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => { void fetchHome(true); }}
              tintColor={Theme.colors.primary}
            />
          }
          accessibilityLabel="Lista de anime"
          accessibilityRole="list"
        />
      </View>
    </ScreenWrapper>
  );
});

export default function Home() {
  return (
      <ErrorBoundary>
      <HomeContent />
      </ErrorBoundary>
  );
}

