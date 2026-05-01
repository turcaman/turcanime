import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Theme } from "../../constants/Theme";
import { AnimatedPressable } from "../AnimatedPressable";
import { ThemedText } from "./ThemedText";

interface ListRowProps {
  title: string;
  subtitle?: string;
  posterUrl?: string;
  onPress?: () => void;
  onRemove?: () => void;
  showChevron?: boolean;
}

export const ListRow = ({
  title,
  subtitle,
  posterUrl,
  onPress,
  onRemove,
  showChevron,
}: ListRowProps) => {
  return (
    <View style={styles.row}>
      <AnimatedPressable
        style={styles.content}
        onPress={onPress}
        disabled={!onPress}
      >
        {posterUrl && (
          <View style={styles.posterWrap}>
            <Image
              source={{ uri: posterUrl }}
              style={styles.poster}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </View>
        )}
        <View style={styles.textContainer}>
          <ThemedText
            variant="body"
            style={styles.title}
            numberOfLines={1}
          >
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText variant="caption" color="muted">
              {subtitle}
            </ThemedText>
          )}
        </View>
        {showChevron && onPress && (
          <Feather
            name="chevron-right"
            size={18}
            color={Theme.colors.text.muted}
            style={styles.chevron}
          />
        )}
      </AnimatedPressable>
      {onRemove && (
        <AnimatedPressable style={styles.remove} onPress={onRemove}>
          <Feather
            name="x"
            size={Theme.dimensions.iconSm}
            color={Theme.colors.text.muted}
          />
        </AnimatedPressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.edge.horizontal,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  posterWrap: {
    width: Theme.dimensions.cardPosterSm.width,
    height: Theme.dimensions.cardPosterSm.height,
    borderRadius: Theme.radius.s,
    overflow: "hidden",
    backgroundColor: Theme.colors.surface,
    marginRight: Theme.spacing.md,
  },
  poster: {
    flex: 1,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontWeight: Theme.fontWeight.medium as "500",
  },
  chevron: {
    marginLeft: Theme.spacing.sm,
  },
  remove: {
    padding: Theme.spacing.sm,
    marginLeft: Theme.spacing.sm,
  },
});
