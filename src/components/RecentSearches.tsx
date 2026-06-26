import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { FlatList, Text, View } from "react-native";
import { AnimatedPressable } from "./AnimatedPressable";
import { SectionTitle } from "./ui/SectionTitle";

interface RecentSearchesProps {
  searches: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
}

export const RecentSearches = memo(({ searches, onSelect, onRemove }: RecentSearchesProps) => {
  if (searches.length === 0) return null;

  return (
    <View className="mt-3 pb-20">
      <SectionTitle>Búsquedas recientes</SectionTitle>
      <View className="mb-3" />
      <FlatList
        data={searches}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <AnimatedPressable className="mb-2 flex-row items-center justify-between border-b border-neutral-800 py-2" onPress={() => { onSelect(item); }}>
            <View className="flex-1 flex-row items-center">
              <Feather name="clock" size={18} color="#A855F7" />
              <Text className="ml-3 text-base text-white">{item}</Text>
            </View>
            <AnimatedPressable className="p-2" onPress={(e) => { e.stopPropagation(); onRemove(item); }}>
              <Feather name="x" size={18} color="#737373" />
            </AnimatedPressable>
          </AnimatedPressable>
        )}
        scrollEnabled={false}
      />
    </View>
  );
});

RecentSearches.displayName = "RecentSearches";
