import { ContinueWatching } from "@/components/home/ContinueWatching";
import { HomeHero } from "@/components/home/HomeHero";
import { MediaSection } from "@/components/home/MediaSection";
import { AppLoader } from "@/components/ui/AppLoader";
import { ErrorState } from "@/components/ui/ErrorState";
import { ThemedView } from "@/components/ui/ThemedView";
import { TAB_BAR_BOTTOM_OFFSET } from "@/constants/layout";
import { Theme } from "@/constants/Theme";
import { SectionItem, useHomeScreen } from "@/lib/hooks/useHomeScreen";
import { useTabBarVisibility } from "@/lib/hooks/useTabBarVisibility";
import React, { useEffect } from "react";
import { FlatList, RefreshControl, StyleSheet } from "react-native";

export default function Home() {
  const { sections, isLoading, error, fetchHome, hasContent } = useHomeScreen();
  const { handleScroll, reset } = useTabBarVisibility({ threshold: 8 });

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

  if (isLoading) {
    return (
      <ThemedView style={styles.root}>
        <AppLoader variant="full" />
      </ThemedView>
    );
  }

  if (!hasContent && error) {
    return (
      <ThemedView style={styles.root}>
        <ErrorState onRetry={() => fetchHome(true)} />
      </ThemedView>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mainScroll: {
    paddingBottom: TAB_BAR_BOTTOM_OFFSET,
  },
});
