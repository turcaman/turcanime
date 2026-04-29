import { AnimatedPressable } from "@/components/AnimatedPressable";
import { ContinueWatching } from "@/components/home/ContinueWatching";
import { HomeHero } from "@/components/home/HomeHero";
import { MediaSection } from "@/components/home/MediaSection";
import { AppLoader } from "@/components/ui/AppLoader";
import { ThemedText } from "@/components/ui/ThemedText";
import { ThemedView } from "@/components/ui/ThemedView";
import { TAB_BAR_BOTTOM_OFFSET } from "@/constants/layout";
import { Theme } from "@/constants/Theme";
import { SectionItem, useHomeScreen } from "@/lib/hooks/useHomeScreen";
import { useTabBarVisibility } from "@/lib/hooks/useTabBarVisibility";
import { Feather } from "@expo/vector-icons";
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
        <ThemedView style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={Theme.colors.text.muted} />
          <ThemedText variant="h3" color="muted" style={styles.errorTitle}>
            Error al cargar
          </ThemedText>
          <AnimatedPressable
            style={styles.retryButton}
            onPress={() => fetchHome(true)}
          >
            <Feather name="refresh-cw" size={16} color={Theme.colors.primary} />
            <ThemedText variant="caption" color="accent" style={styles.retryText}>
              Reintentar
            </ThemedText>
          </AnimatedPressable>
        </ThemedView>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Theme.space.generous,
  },
  errorTitle: {
    marginTop: Theme.component.gapSm,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Theme.component.gapSm,
    paddingHorizontal: Theme.space.comfortable,
    paddingVertical: Theme.component.innerMd,
  },
  retryText: {
    marginLeft: Theme.component.gapSm,
  },
});
