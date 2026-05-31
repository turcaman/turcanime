import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Theme } from "../../constants/Theme";
import { AnimatedPressable } from "../AnimatedPressable";
import { ImageWithLoader } from "./ImageWithLoader";
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
        {posterUrl != null && posterUrl !== '' && (
          <View style={styles.posterWrap}>
            <ImageWithLoader
              uri={posterUrl}
              style={styles.poster}
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
          {subtitle != null && subtitle !== '' && (
            <ThemedText variant="caption" color="muted">
              {subtitle}
            </ThemedText>
          )}
        </View>
        {showChevron === true && onPress != null && (
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
            size={Theme.dimensions.icon.sm}
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
    width: Theme.dimensions.poster.sm.width,
    height: Theme.dimensions.poster.sm.height,
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
