import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import {
    type GestureResponderEvent,
    type PressableProps,
    type StyleProp,
    type ViewStyle,
    Platform,
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
}

/**
 * Consistent press feedback across the app.
 * Fixed values ensure all interactive elements feel identical.
 */
export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  style,
  onPressIn,
  onPressOut,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  hapticFeedback = true,
  ...rest
}) => {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback((e: GestureResponderEvent) => {
    scale.value = withTiming(0.96, { duration: 80 });
    opacity.value = withTiming(0.8, { duration: 80 });

    // Haptic feedback on press
    if (hapticFeedback && Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (onPressIn) onPressIn(e);
  }, [onPressIn, hapticFeedback, scale, opacity]);

  const handlePressOut = useCallback((e: GestureResponderEvent) => {
    scale.value = withTiming(1, { duration: 120 });
    opacity.value = withTiming(1, { duration: 120 });
    if (onPressOut) onPressOut(e);
  }, [onPressOut, scale, opacity]);

  return (
    <AnimatedPressableComponent
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
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
