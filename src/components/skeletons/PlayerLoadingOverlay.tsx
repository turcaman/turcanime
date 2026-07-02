import { useEffect } from "react";
import { ActivityIndicator, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";

interface PlayerLoadingOverlayProps {
  visible: boolean;
}

export function PlayerLoadingOverlay({ visible }: PlayerLoadingOverlayProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
  }, [visible, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      className="absolute inset-0 items-center justify-center"
      style={[{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 50 }, animatedStyle]}
      pointerEvents="none"
    >
      <ActivityIndicator size="large" color="#A855F7" />
      <Text className="mt-4 text-sm font-medium text-neutral-400">
        Cargando video...
      </Text>
    </Animated.View>
  );
}
