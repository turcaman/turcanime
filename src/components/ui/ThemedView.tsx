import React from "react";
import { View, ViewProps, ViewStyle } from "react-native";
import { Theme } from "../../constants/Theme";

interface ThemedViewProps extends ViewProps {
  variant?: "background" | "surface" | "border";
  padding?: keyof typeof Theme.space;
  margin?: keyof typeof Theme.space;
  radius?: keyof typeof Theme.radius;
  border?: boolean;
}

export const ThemedView = ({
  variant = "background",
  padding,
  margin,
  radius,
  border,
  style,
  ...props
}: ThemedViewProps) => {
  const backgroundColor = Theme.colors[variant] || Theme.colors.background;

  const customStyles: ViewStyle = {
    backgroundColor,
  };

  if (padding) customStyles.padding = Theme.space[padding];
  if (margin) customStyles.margin = Theme.space[margin];
  if (radius) customStyles.borderRadius = Theme.radius[radius];

  if (border || variant === "border") {
      if (variant !== "border") {
          customStyles.backgroundColor = backgroundColor;
      } else {
          customStyles.backgroundColor = "transparent";
      }
      customStyles.borderWidth = 1;
      customStyles.borderColor = Theme.colors.border;
  }

  return (
    <View
      style={[
        customStyles,
        style
      ]}
      {...props}
    />
  );
};
