import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "../AnimatedPressable";

interface ActionRowProps {
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  noBorder?: boolean;
}

export const ActionRow = ({
  icon,
  label,
  description,
  value,
  onPress,
  noBorder,
}: ActionRowProps) => {

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!onPress}
      hapticFeedback={!!onPress}
      className={`flex-row items-center py-4 px-5 ${noBorder === true ? "" : "border-b border-neutral-800"}`}
    >
      {icon && (
        <Feather
          name={icon}
          size={18}
          color="#737373"
          style={{ marginRight: 12 }}
        />
      )}
      <View className="flex-1 mr-2">
        <Text className="text-base font-medium text-white">
          {label}
        </Text>
        {description != null && description !== "" && (
          <Text className="mt-1 text-xs font-semibold tracking-wide text-neutral-400">
            {description}
          </Text>
        )}
      </View>
      {value != null && value !== "" ? (
        <Text className="text-base font-medium text-neutral-400">
          {value}
        </Text>
      ) : onPress ? (
        <Feather
          name="chevron-right"
          size={18}
          color="#737373"
        />
      ) : null}
    </AnimatedPressable>
  );
};
