import { FlatList, StyleSheet, View } from "react-native";
import { searchGridCardWidth } from "@/constants/layout";
import { Theme } from "@/constants/Theme";
import type { Anime } from "@/lib/domain/entities";
import React, { memo, useMemo } from "react";
import AnimeCard from "../AnimeCard";
import { SectionTitle } from "../ui/SectionTitle";

interface AnimeGridSectionProps {
  label: string;
  items: Anime[];
}

export const AnimeGridSection = memo(({ label, items }: AnimeGridSectionProps) => {
  const cardWidth = searchGridCardWidth();

  const columnWrapperStyle = useMemo(() => ({
    justifyContent: "flex-start" as const,
    gap: 10,
  }), []);

  if (!items || items.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.titleWrapper}>
        <SectionTitle>{label}</SectionTitle>
      </View>
      <FlatList
        data={items}
        numColumns={3}
        keyExtractor={(item) => item.url}
        renderItem={({ item }) => (
          <View style={[styles.cardWrapper, { width: cardWidth }]}>
            <AnimeCard anime={item} width={cardWidth} />
          </View>
        )}
        columnWrapperStyle={columnWrapperStyle}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  sectionContainer: {},
  titleWrapper: {},
  listContent: {},
  cardWrapper: { marginBottom: Theme.spacing.sm },
});

AnimeGridSection.displayName = "AnimeGridSection";
