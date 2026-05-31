import React, { memo, useEffect, useRef } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Theme } from "../constants/Theme";
import { AnimatedPressable } from "./AnimatedPressable";
import { ThemedText } from "./ui/ThemedText";

const RANGE_BADGE_WIDTH = Theme.dimensions.layout.episodeRangeBadge.width;
const RANGE_BADGE_GAP = Theme.dimensions.layout.episodeRangeBadge.gap;

interface EpisodeRange {
  label: string;
  start: number;
  end: number;
}

interface EpisodeRangeSelectorProps {
  ranges: EpisodeRange[];
  activeRangeIdx: number;
  setActiveRangeIdx: (idx: number) => void;
  isRestoring: boolean;
}

export const EpisodeRangeSelector = memo(({
  ranges, activeRangeIdx, setActiveRangeIdx, isRestoring
}: EpisodeRangeSelectorProps) => {
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (ranges.length > 0 && listRef.current && !isRestoring) {
      // Validate index is within bounds to prevent scrollToIndex failures
      const validIndex = Math.max(0, Math.min(activeRangeIdx, ranges.length - 1));
      if (validIndex !== activeRangeIdx) {
        return; // Don't scroll if index is invalid, let parent correct it
      }

      const timer = setTimeout(() => {
        // Double-check ref and bounds before scrolling
        if (listRef.current && validIndex < ranges.length) {
          listRef.current.scrollToIndex({
            index: validIndex,
            animated: true,
            viewPosition: 0.5,
          });
        }
      }, 100);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [activeRangeIdx, ranges.length, isRestoring]);

  if (ranges.length <= 1) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        data={ranges}
        keyExtractor={(item) => item.label}
        renderItem={({ item, index }) => {
          const isActive = activeRangeIdx === index;
          return (
            <AnimatedPressable
              onPress={() => { setActiveRangeIdx(index); }}
              style={[styles.badge, isActive && styles.badgeActive]}
            >
              <ThemedText
                variant="caption"
                color={isActive ? "accent" : "dark"}
              >
                {item.label}
              </ThemedText>
            </AnimatedPressable>
          );
        }}
        contentContainerStyle={styles.scroll}
        getItemLayout={(_, index) => ({
          length: RANGE_BADGE_WIDTH,
          offset: (RANGE_BADGE_WIDTH + RANGE_BADGE_GAP) * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
          });
        }}
      />
    </View>
  );
});

EpisodeRangeSelector.displayName = "EpisodeRangeSelector";

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.md,
  },
  scroll: {
    gap: Theme.dimensions.layout.episodeRangeBadge.gap,
    paddingHorizontal: Theme.edge.horizontal,
  },
  badge: {
    backgroundColor: Theme.colors.surface,
    gap: Theme.dimensions.layout.episodeRangeBadge.gap,
    width: Theme.dimensions.layout.episodeRangeBadge.width,
    alignItems: "center",
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.m,
  },
  badgeActive: {
    backgroundColor: Theme.colors.primaryMuted,
  },
});
