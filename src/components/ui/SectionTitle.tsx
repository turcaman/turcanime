import React from "react";
import { Text } from "react-native";

interface SectionTitleProps {
  children: React.ReactNode;
}

export const SectionTitle = ({ children }: SectionTitleProps) => (
  <Text className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
    {children}
  </Text>
);
