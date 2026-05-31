import React from "react";
import { type ViewProps, type ViewStyle, View } from "react-native";
import { Theme } from "../../constants/Theme";

interface ThemedViewProps extends ViewProps {
  variant?: "background" | "surface" | "border";
  padding?: keyof typeof Theme.spacing;
  margin?: keyof typeof Theme.spacing;
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
  const backgroundColor = Theme.colors[variant];

  const customStyles: ViewStyle = {
    backgroundColor,
  };

  if (padding) customStyles.padding = Theme.spacing[padding as keyof typeof Theme.spacing];
  if (margin) customStyles.margin = Theme.spacing[margin as keyof typeof Theme.spacing];
  if (radius) customStyles.borderRadius = Theme.radius[radius];

  if (border === true || variant === "border") {
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
