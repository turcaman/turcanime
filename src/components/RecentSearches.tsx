import { TAB_BAR_BOTTOM_OFFSET } from "@/constants/layout";
import { Theme } from "@/constants/Theme";
import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { AnimatedPressable } from "./AnimatedPressable";
import { SectionTitle } from "./ui/SectionTitle";
import { ThemedText } from "./ui/ThemedText";

interface RecentSearchesProps {
  searches: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
}

export const RecentSearches = memo(({ searches, onSelect, onRemove }: RecentSearchesProps) => {
  if (searches.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionTitle>Búsquedas recientes</SectionTitle>
      <FlatList
        data={searches}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <AnimatedPressable style={styles.row} onPress={() => { onSelect(item); }}>
            <View style={styles.left}>
              <Feather name="clock" size={Theme.dimensions.icon.sm} color={Theme.colors.primary} />
              <ThemedText style={styles.text}>{item}</ThemedText>
            </View>
            <AnimatedPressable style={styles.remove} onPress={(e) => { e.stopPropagation(); onRemove(item); }}>
              <Feather name="x" size={Theme.dimensions.icon.sm} color={Theme.colors.text.muted} />
            </AnimatedPressable>
          </AnimatedPressable>
        )}
        scrollEnabled={false}
      />
    </View>
  );
});

RecentSearches.displayName = "RecentSearches";

const styles = StyleSheet.create({
  container: {
    marginTop: Theme.spacing.md,
    paddingBottom: TAB_BAR_BOTTOM_OFFSET,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1 },
  text: { marginLeft: Theme.spacing.md, fontSize: Theme.fontSize.m },
  remove: { padding: Theme.spacing.sm },
});
