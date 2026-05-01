import { Feather } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Theme } from "../constants/Theme";
import { useUIStore } from "../lib/store/uiStore";
import { AnimatedPressable } from "./AnimatedPressable";

type FloatingTabBarProps = BottomTabBarProps;

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: "home",
  search: "search",
};

const LABELS: Record<string, string> = {
  index: "Inicio",
  search: "Buscar",
};

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const visible = useUIStore((state) => state.tabBarVisible);

  // Entry/exit animation
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 120, {
      duration: 250,
    });
  }, [visible, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + Theme.spacing.lg,
        },
        animatedStyle,
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = ICONS[route.name] || "circle";
          const color = isFocused
            ? Theme.colors.primary
            : Theme.colors.text.muted;

          return (
            <AnimatedPressable
              key={route.key}
              onPress={onPress}
              style={styles.tabButton}
              hapticFeedback={false}
              accessibilityLabel={LABELS[route.name]}
              accessibilityRole="button"
            >
              <Feather name={iconName} size={20} color={color} />
            </AnimatedPressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.radius.l,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    gap: Theme.spacing.lg,
    elevation: 8, // Native Android shadow for accessibility/differentiation
  },
  tabButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Theme.radius.m,
  },
});
