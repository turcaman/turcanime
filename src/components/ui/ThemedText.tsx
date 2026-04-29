import React from "react";
import { StyleSheet, Text, TextProps, TextStyle } from "react-native";
import { Theme } from "../../constants/Theme";

type FontWeight = "400" | "500" | "600" | "700" | "800";

interface ThemedTextProps extends TextProps {
  variant?: "h1" | "h2" | "h3" | "body" | "caption" | "label" | "hero";
  color?: keyof typeof Theme.colors.text;
  weight?: FontWeight;
}

export const ThemedText = ({
  variant = "body",
  color = "primary",
  weight,
  style,
  ...props
}: ThemedTextProps) => {
  const variantStyles = styles[variant];
  const textColor = Theme.colors.text[color];
  const fontWeight = weight || (variantStyles.fontWeight as FontWeight);

  return (
    <Text
      style={[
        variantStyles,
        { color: textColor, fontWeight } as TextStyle,
        style
      ]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  hero: {
    fontSize: Theme.fontSize.xxxl,
    fontWeight: Theme.fontWeight.heavy,
    lineHeight: Theme.lineHeight.xxl,
  },
  h1: {
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.heavy,
    letterSpacing: -0.5,
    lineHeight: Theme.lineHeight.xl,
  },
  h2: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.bold,
    lineHeight: Theme.lineHeight.l,
  },
  h3: {
    fontSize: Theme.fontSize.l,
    fontWeight: Theme.fontWeight.bold,
    lineHeight: Theme.lineHeight.m,
  },
  body: {
    fontSize: Theme.fontSize.m,
    lineHeight: Theme.lineHeight.m,
    fontWeight: Theme.fontWeight.medium,
  },
  label: {
    fontSize: Theme.fontSize.s,
    fontWeight: Theme.fontWeight.heavy,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    lineHeight: Theme.lineHeight.s,
  },
  caption: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
    letterSpacing: 0.5,
    lineHeight: Theme.lineHeight.xs,
  }
});
