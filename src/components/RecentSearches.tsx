import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Theme } from "../constants/Theme";
import { AnimatedPressable } from "./AnimatedPressable";
import { ThemedText } from "./ui/ThemedText";

interface RecentSearchesProps {
  searches: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
}

export const RecentSearches = memo(({ searches, onSelect, onRemove }: RecentSearchesProps) => {
  if (!searches || searches.length === 0) return null;

  return (
    <View style={styles.container}>
      <ThemedText variant="label" color="muted" style={styles.header}>Búsquedas recientes</ThemedText>
      <FlatList
        data={searches}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <AnimatedPressable style={styles.clickable} onPress={() => onSelect(item)}>
              <Feather name="clock" size={Theme.dimensions.iconSm} color={Theme.colors.primary} />
              <ThemedText style={styles.text}>{item}</ThemedText>
            </AnimatedPressable>
            <AnimatedPressable style={styles.remove} onPress={() => onRemove(item)}>
              <Feather name="x" size={Theme.dimensions.iconSm} color={Theme.colors.text.muted} />
            </AnimatedPressable>
          </View>
        )}
        scrollEnabled={false}
      />
    </View>
  );
});

RecentSearches.displayName = "RecentSearches";

const styles = StyleSheet.create({
  container: { marginTop: Theme.spacing.md },
  header: { marginBottom: Theme.spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.sm,
  },
  clickable: { flexDirection: "row", alignItems: "center", flex: 1 },
  text: { marginLeft: Theme.spacing.sm, fontSize: Theme.fontSize.m },
  remove: { padding: Theme.spacing.sm }
});
