import { FlatList, View } from "react-native";
import type { Anime } from "@/lib/domain/entities";
import React, { memo, useMemo } from "react";
import { useSearchCardWidth } from "@/lib/hooks/useSearchCardWidth";
import AnimeCard from "../AnimeCard";
import { SectionTitle } from "../ui/SectionTitle";

interface AnimeGridSectionProps {
  label: string;
  items: Anime[];
}

export const AnimeGridSection = memo(({ label, items }: AnimeGridSectionProps) => {
  const cardWidth = useSearchCardWidth();

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
