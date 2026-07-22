import React from "react";
import { Text } from "react-native";

interface SectionTitleProps {
  children: React.ReactNode;
}

export const SectionTitle = ({ children }: SectionTitleProps) => (
  <Text className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
    {children}
  </Text>
);
