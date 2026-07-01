import { useWindowDimensions, View } from "react-native";
import type { Anime } from "@/types";
import React, { memo, useMemo } from "react";
import AnimeCard from "../AnimeCard";
import { SectionTitle } from "../ui/SectionTitle";
import { calcCardWidth } from "@/utils/layout";

interface AnimeGridSectionProps {
  label: string;
  items: Anime[];
}

export const AnimeGridSection = memo(({ label, items }: AnimeGridSectionProps) => {
  const { width } = useWindowDimensions();
  const cardWidth = calcCardWidth(width);

  const rows = useMemo(() => {
    const result: Anime[][] = [];
    for (let i = 0; i < items.length; i += 3) {
      result.push(items.slice(i, i + 3));
    }
    return result;
  }, [items]);

  if (items.length === 0) return null;

  return (
    <View>
      <SectionTitle>{label}</SectionTitle>
      <View className="mb-3" />
      <View style={{ gap: 12 }}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: "row", gap: 12 }}>
            {row.map((item) => (
              <View key={item.url} style={{ width: cardWidth }}>
                <AnimeCard anime={item} width={cardWidth} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
});

AnimeGridSection.displayName = "AnimeGridSection";
