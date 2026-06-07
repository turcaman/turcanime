import React from "react";
import { ActivityIndicator, View } from "react-native";


interface AppLoaderProps {
  variant?: "full" | "small";
}

export const AppLoader = ({ variant = "full" }: AppLoaderProps) => {
  if (variant === "small") {
    return (
      <View className="justify-center items-center p-4">
        <ActivityIndicator size="small" color="#A855F7" />
      </View>
    );
  }

  return (
    <View className="absolute inset-0 justify-center items-center z-10">
      <ActivityIndicator size="large" color="#A855F7" />
    </View>
  );
};
