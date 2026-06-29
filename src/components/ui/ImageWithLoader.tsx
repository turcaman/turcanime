import React from "react";
import { type ViewStyle, Image, View, Text } from "react-native";

interface ImageWithLoaderProps {
  uri: string;
  style?: ViewStyle | ViewStyle[];
  className?: string;
  errorText?: string;
}

export const ImageWithLoader = ({
  uri,
  style,
  className,
  errorText = "Error",
}: ImageWithLoaderProps) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [uri]);

  return (
    <View className={`overflow-hidden bg-neutral-900 rounded-lg${className != null ? ` ${className}` : ""}`} style={style}>
      {!hasError && uri ? (
        <Image
          source={{ uri }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          resizeMode="cover"
          onLoad={() => { setHasError(false); }}
          onError={() => { setHasError(true); }}
        />
      ) : null}
      {hasError && (
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-sm text-neutral-500">{errorText}</Text>
        </View>
      )}
    </View>
  );
};
