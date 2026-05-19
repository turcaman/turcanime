import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Theme } from "../../constants/Theme";
import { AnimatedPressable } from "../AnimatedPressable";
import { ThemedText } from "./ThemedText";

interface ActionRowProps {
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  noBorder?: boolean;
}

export const ActionRow = ({
  icon,
  label,
  description,
  value,
  onPress,
  noBorder,
}: ActionRowProps) => {

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!onPress}
      hapticFeedback={!!onPress}
      style={[styles.row, noBorder && styles.noBorder]}
    >
      {icon && (
        <Feather
          name={icon}
          size={18}
          color={Theme.colors.text.muted}
          style={styles.icon}
        />
      )}
      <View style={styles.textContainer}>
        <ThemedText variant="body" color="primary" style={styles.label}>
          {label}
        </ThemedText>
        {description && (
          <ThemedText variant="caption" color="muted" style={styles.description}>
            {description}
          </ThemedText>
        )}
      </View>
      {value ? (
        <ThemedText variant="body" color="muted">
          {value}
        </ThemedText>
      ) : onPress ? (
        <Feather
          name="chevron-right"
          size={18}
          color={Theme.colors.text.muted}
        />
      ) : null}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.edge.horizontal,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  icon: {
    marginRight: Theme.spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  label: {
    fontWeight: Theme.fontWeight.medium as "500",
  },
  description: {
    marginTop: Theme.spacing.xs,
  },
});
