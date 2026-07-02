import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef } from 'react';
import {
    type GestureResponderEvent,
    type PressableProps,
    type StyleProp,
    type ViewStyle,
    Pressable,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  hapticFeedback?: boolean;
  /** Duration in ms to ignore subsequent presses after the first one. */
  debounceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Consistent press feedback across the app.
 * Fixed values ensure all interactive elements feel identical.
 * Built-in debounce prevents double-tap navigation bugs.
 */
export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  style,
  onPressIn,
  onPressOut,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  hapticFeedback = false,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  ...rest
}) => {
  const lastPressTimeRef = useRef(0);

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      const now = Date.now();
      if (now - lastPressTimeRef.current < debounceMs) {
        return;
      }
      lastPressTimeRef.current = now;
      if (hapticFeedback) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress?.(e);
    },
    [onPress, hapticFeedback, debounceMs],
  );

  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback((e: GestureResponderEvent) => {
    scale.value = withTiming(0.96, { duration: 80 });
    opacity.value = withTiming(0.8, { duration: 80 });
    if (onPressIn) onPressIn(e);
  }, [onPressIn, scale, opacity]);

  const handlePressOut = useCallback((e: GestureResponderEvent) => {
    scale.value = withTiming(1, { duration: 120 });
    opacity.value = withTiming(1, { duration: 120 });
    if (onPressOut) onPressOut(e);
  }, [onPressOut, scale, opacity]);

  return (
    <AnimatedPressableComponent
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[style, animatedStyle]}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      {...rest}
    >
      {children}
    </AnimatedPressableComponent>
  );
};

AnimatedPressable.displayName = "AnimatedPressable";
