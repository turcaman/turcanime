import React, { memo, useEffect, useRef } from "react";
import { FlatList, Text, View } from "react-native";
import { AnimatedPressable } from "./AnimatedPressable";

const RANGE_BADGE_WIDTH = 90;
const RANGE_BADGE_GAP = 12;

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
      const validIndex = Math.max(0, Math.min(activeRangeIdx, ranges.length - 1));
      if (validIndex !== activeRangeIdx) {
        return; // Don't scroll if index is invalid, let parent correct it
      }

      const timer = setTimeout(() => {
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
    <View className="mt-3 mb-2">
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
              className={`rounded-lg bg-neutral-900 gap-3 w-[90px] items-center py-2 ${isActive ? "bg-purple-500/15" : ""}`}
            >
              <Text className={`text-xs ${isActive ? "text-purple-500" : "text-neutral-500"}`}>
                {item.label}
              </Text>
            </AnimatedPressable>
          );
        }}
        contentContainerClassName="gap-3 px-5"
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
