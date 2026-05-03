import { ContinueWatching } from "@/components/home/ContinueWatching";
import { HomeHero } from "@/components/home/HomeHero";
import { MediaSection } from "@/components/home/MediaSection";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { ThemedView } from "@/components/ui/ThemedView";
import { WithErrorBoundary } from "@/components/WithErrorBoundary";
import { TAB_BAR_BOTTOM_OFFSET } from "@/constants/layout";
import { Theme } from "@/constants/Theme";
import { SectionItem, useHomeScreen } from "@/lib/hooks/useHomeScreen";
import { useTabBarManager } from "@/lib/hooks/useTabBarManager";
import React, { useEffect } from "react";
import { FlatList, RefreshControl, StyleSheet } from "react-native";

const HomeContent = React.memo(function HomeContent() {
  const { sections, isLoading, error, fetchHome, hasContent } = useHomeScreen();
  const { handleScroll, reset } = useTabBarManager({ threshold: 8 });

  useEffect(() => {
    fetchHome();
    reset();
  }, [fetchHome, reset]);

  const renderItem = ({ item }: { item: SectionItem }) => {
    if (item.type === "HERO") {
      return <HomeHero featured={item.data} />;
    }
    if (item.type === "CONTINUE") {
      return <ContinueWatching items={item.items} />;
    }
    return (
      <MediaSection
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
      onRetry={() => fetchHome(true)}
    >
      <ThemedView style={styles.root}>
        <FlatList
          data={sections}
          keyExtractor={(item: SectionItem, index: number) => `${item.type}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.mainScroll}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={null}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => fetchHome(true)}
              tintColor={Theme.colors.primary}
            />
          }
          accessibilityLabel="Lista de anime"
          accessibilityRole="list"
        />
      </ThemedView>
    </ScreenWrapper>
  );
});

export default function Home() {
  return (
    <WithErrorBoundary>
      <HomeContent />
    </WithErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mainScroll: {
    paddingBottom: TAB_BAR_BOTTOM_OFFSET,
  },
});
