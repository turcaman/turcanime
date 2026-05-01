import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet } from "react-native";
import { Theme } from "../../constants/Theme";
import { AnimatedPressable } from "../AnimatedPressable";
import { ThemedText } from "./ThemedText";

interface ActionRowProps {
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  isDestructive?: boolean;
}

export const ActionRow = ({
  icon,
  label,
  value,
  onPress,
  isDestructive,
}: ActionRowProps) => {
  const labelColor = isDestructive ? "primary" : "primary";
  const iconColor = isDestructive
    ? Theme.colors.error
    : Theme.colors.text.muted;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!onPress}
      hapticFeedback={!!onPress}
      style={styles.row}
    >
      {icon && (
        <Feather
          name={icon}
          size={18}
          color={iconColor}
          style={styles.icon}
        />
      )}
      <ThemedText variant="body" color={labelColor} style={styles.label}>
        {label}
      </ThemedText>
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
  icon: {
    marginRight: Theme.spacing.md,
  },
  label: {
    flex: 1,
  },
});
