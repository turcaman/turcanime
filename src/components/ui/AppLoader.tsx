import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";


interface AppLoaderProps {
  variant?: "full" | "small";
}

export const AppLoader = ({ variant = "full" }: AppLoaderProps) => {
  if (variant === "small") {
    return (
      <View style={styles.smallContainer}>
        <ActivityIndicator size="small" color="#A855F7" />
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <ActivityIndicator size="large" color="#A855F7" />
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
    padding: 16,
  },
});
