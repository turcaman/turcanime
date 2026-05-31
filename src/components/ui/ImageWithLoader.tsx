import React from "react";
import { type ViewStyle, Image as RNImage, View, Text } from "react-native";

interface ImageWithLoaderProps {
  uri: string;
  style?: ViewStyle | ViewStyle[];
  className?: string;
  loadingText?: string;
  errorText?: string;
}

export const ImageWithLoader = ({
  uri,
  style,
  className,
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

  React.useEffect(() => {
    if (!uri || uri.trim() === "") {
      setIsLoading(false);
      setHasError(true);
      return;
    }
    setIsLoading(true);
    setHasError(false);
  }, [uri]);

  return (
    <View className={`overflow-hidden bg-neutral-900 rounded-lg${className != null ? ` ${className}` : ""}`} style={style}>
      {isLoading && !hasError && (
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-sm text-neutral-500">{loadingText}</Text>
        </View>
      )}
      {hasError && (
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-sm text-neutral-500">{errorText}</Text>
        </View>
      )}
      {!hasError && uri ? (
        <RNImage
          source={{ uri }}
          className="absolute inset-0"
          resizeMode="cover"
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : null}
    </View>
  );
};
