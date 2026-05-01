import React from "react";
import { StyleSheet } from "react-native";
import { Theme } from "../../constants/Theme";
import { ThemedText } from "./ThemedText";

interface SectionTitleProps {
  children: React.ReactNode;
}

export const SectionTitle = ({ children }: SectionTitleProps) => (
  <ThemedText variant="body" color="muted" style={styles.title}>
    {children}
  </ThemedText>
);

const styles = StyleSheet.create({
  title: {
    marginBottom: Theme.spacing.md,
    fontSize: Theme.fontSize.s,
    fontWeight: Theme.fontWeight.semibold as "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
