import { FlatList, useWindowDimensions, View } from "react-native";
import type { Anime } from "@/lib/domain/entities";
import React, { memo, useMemo } from "react";
import AnimeCard from "../AnimeCard";
import { SectionTitle } from "../ui/SectionTitle";
import { calcCardWidth } from "@/lib/utils/layout";

interface AnimeGridSectionProps {
  label: string;
  items: Anime[];
}

export const AnimeGridSection = memo(({ label, items }: AnimeGridSectionProps) => {
  const { width } = useWindowDimensions();
  const cardWidth = calcCardWidth(width);

  const columnWrapperStyle = useMemo(() => ({
    justifyContent: "flex-start" as const,
    gap: 12,
  }), []);

  if (items.length === 0) return null;

  return (
    <View className="py-4">
        <SectionTitle>{label}</SectionTitle>
      <View className="mb-3" />
      <FlatList
        data={items}
        numColumns={3}
        keyExtractor={(item) => item.url}
        renderItem={({ item }) => (
          <View style={{ width: cardWidth }} className="mb-3">
            <AnimeCard anime={item} width={cardWidth} />
          </View>
        )}
        columnWrapperStyle={columnWrapperStyle}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />
    </View>
  );
});

AnimeGridSection.displayName = "AnimeGridSection";
