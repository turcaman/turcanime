import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Theme } from "../../constants/Theme";

interface AppLoaderProps {
  variant?: "full" | "small";
}

export const AppLoader = ({ variant = "full" }: AppLoaderProps) => {
  if (variant === "small") {
    return (
      <View style={styles.smallContainer}>
        <ActivityIndicator size="small" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <ActivityIndicator size="large" color={Theme.colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  smallContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: Theme.space.comfortable,
  },
});
