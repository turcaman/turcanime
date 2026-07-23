import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "../AnimatedPressable";

interface ErrorStateProps {
  onRetry: () => void;
  title?: string;
}

export function ErrorState({ onRetry, title = "Error al cargar" }: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center bg-black px-5">
      <Feather name="alert-circle" size={48} color="#737373" />
      <Text className="mt-2 text-lg font-bold text-neutral-500">
        {title}
      </Text>
      <AnimatedPressable className="mt-2 flex-row items-center px-4 py-2" onPress={onRetry}>
        <Feather name="refresh-cw" size={16} color="#A855F7" />
        <Text className="ml-2 text-xs font-semibold tracking-wide text-purple-500">
          Reintentar
        </Text>
      </AnimatedPressable>
    </View>
  );
}
