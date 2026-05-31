import React from "react";
import { type ViewStyle, Image as RNImage, StyleSheet, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface ImageWithLoaderProps {
  uri: string;
  style?: ViewStyle | ViewStyle[];
  loadingText?: string;
  errorText?: string;
}

export const ImageWithLoader = ({
  uri,
  style,
  loadingText = "Cargando...",
  errorText = "Error",
}: ImageWithLoaderProps) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  const handleLoad = React.useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = React.useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Reset loading state when URI changes
  React.useEffect(() => {
    if (!uri || uri.trim() === '') {
      setIsLoading(false);
      setHasError(true);
      return;
    }
    setIsLoading(true);
    setHasError(false);
  }, [uri]);

  return (
    <ThemedView variant="surface" style={[styles.container, style]}>
      {isLoading && !hasError && (
        <View style={styles.placeholder}>
          <ThemedText variant="caption" color="muted">
            {loadingText}
          </ThemedText>
        </View>
      )}
      {hasError && (
        <View style={styles.placeholder}>
          <ThemedText variant="caption" color="muted">
            {errorText}
          </ThemedText>
        </View>
      )}
      {!hasError && uri ? (
        <RNImage
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : null}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});
