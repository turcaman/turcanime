import { Feather } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { View } from "react-native";
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
  settings: "settings",
};

const LABELS: Record<string, string> = {
  index: "Inicio",
  search: "Buscar",
  settings: "Ajustes",
};

export function FloatingTabBar({
  state,
  descriptors: _,
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
        {
          position: "absolute",
          left: 0,
          right: 0,
          alignItems: "center",
          justifyContent: "center",
          bottom: insets.bottom + Theme.spacing.lg,
        },
        animatedStyle,
      ]}
      pointerEvents="box-none"
    >
      <View
        className="flex-row items-center justify-center rounded-xl px-4 py-2 gap-4 bg-neutral-900/80"
        style={{ elevation: 8 }}
      >
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

          const iconName = ICONS[route.name];
          const color = isFocused
            ? Theme.colors.primary
            : Theme.colors.text.muted;

          return (
            <AnimatedPressable
              key={route.key}
              onPress={onPress}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 8 }}
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


