import React from "react";
import { Text } from "react-native";

interface SectionTitleProps {
  children: React.ReactNode;
}

export const SectionTitle = ({ children }: SectionTitleProps) => (
  <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-neutral-500">
    {children}
  </Text>
);
