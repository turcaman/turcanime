import { FlatList, useWindowDimensions, View } from "react-native";
import type { Anime } from "@/lib/domain/entities";
import React, { memo, useMemo } from "react";
import AnimeCard from "../AnimeCard";
import { SectionTitle } from "../ui/SectionTitle";

const CARD_WIDTH_CONFIG = { columns: 3, gap: 10, horizontalPad: 20, min: 80, max: 400 };

function calcCardWidth(screenWidth: number): number {
  const { columns, gap, horizontalPad, min, max } = CARD_WIDTH_CONFIG;
  const available = screenWidth - horizontalPad * 2 - gap * (columns - 1);
  return Math.max(min, Math.min(available / columns, max));
}

interface AnimeGridSectionProps {
  label: string;
  items: Anime[];
}

export const AnimeGridSection = memo(({ label, items }: AnimeGridSectionProps) => {
  const { width } = useWindowDimensions();
  const cardWidth = calcCardWidth(width);

  const columnWrapperStyle = useMemo(() => ({
    justifyContent: "flex-start" as const,
    gap: 10,
  }), []);

  if (items.length === 0) return null;

  return (
    <View className="py-4">
      <View className="mb-2">
        <SectionTitle>{label}</SectionTitle>
      </View>
      <FlatList
        data={items}
        numColumns={3}
        keyExtractor={(item) => item.url}
        renderItem={({ item }) => (
          <View style={{ width: cardWidth }} className="mb-2">
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
