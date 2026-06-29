import React, { memo } from "react";
import { Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import type { HistoryItem } from "../../lib/domain/entities";
import { navigateToAnime } from "../../lib/utils/navigation";
import { AnimatedPressable } from "../AnimatedPressable";
import { ImageWithLoader } from "../ui/ImageWithLoader";
import { SectionTitle } from "../ui/SectionTitle";

interface ContinueWatchingProps {
  items: HistoryItem[];
}

function ProgressBar({ progress, duration }: { progress?: number; duration?: number }) {
  const pct = progress != null && duration != null && duration > 0
    ? Math.min(progress / duration, 1)
    : 0;

  return (
    <View className="h-0.5 bg-neutral-800 mt-1">
      <View className="h-full bg-purple-500" style={{ width: `${pct * 100}%` }} />
    </View>
  );
}

export const ContinueWatching = memo(({ items }: ContinueWatchingProps) => {
  if (items.length === 0) return null;

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <AnimatedPressable
      className="mr-3 w-[110px] h-[165px] rounded-xl overflow-hidden bg-neutral-950"
      onPress={() => { navigateToAnime(item.url); }}
      accessibilityLabel={`Continuar viendo: ${item.title}`}
    >
      <ImageWithLoader
        uri={item.image}
        style={{ width: "100%", height: "100%" }}
      />
      <View className="absolute bottom-0 left-0 right-0 bg-neutral-950/80 px-2 pb-2 pt-1.5">
        <Text className="text-xs font-semibold text-neutral-400 mb-0.5">
          Ep. {item.number}
        </Text>
        <Text numberOfLines={1} className="text-sm font-bold text-white">
          {item.title}
        </Text>
        <ProgressBar progress={item.progress} duration={item.duration} />
      </View>
    </AnimatedPressable>
  );

  return (
    <View>
        <SectionTitle>Continuar viendo</SectionTitle>
      <View className="mb-3" />
      <FlashList
        horizontal
        data={items}
        keyExtractor={(item) => item.url}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
});

ContinueWatching.displayName = "ContinueWatching";
