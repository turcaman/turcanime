import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "../AnimatedPressable";
import { ImageWithLoader } from "./ImageWithLoader";

interface ListRowProps {
  title: string;
  subtitle?: string;
  posterUrl?: string;
  onPress?: () => void;
  onRemove?: () => void;
  showChevron?: boolean;
}

export const ListRow = ({
  title,
  subtitle,
  posterUrl,
  onPress,
  onRemove,
  showChevron,
}: ListRowProps) => {
  return (
    <View className="flex-row items-center justify-between py-3 px-5 border-b border-neutral-800">
      <AnimatedPressable
        className="flex-row items-center flex-1"
        onPress={onPress}
        disabled={!onPress}
      >
        {posterUrl != null && posterUrl !== '' && (
          <View className="w-10 h-14 rounded overflow-hidden bg-neutral-900 mr-3">
            <ImageWithLoader
              uri={posterUrl}
              style={{ flex: 1 }}
            />
          </View>
        )}
        <View className="flex-1 justify-center">
          <Text
            className="text-white font-medium"
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle != null && subtitle !== '' && (
            <Text className="text-neutral-400">
              {subtitle}
            </Text>
          )}
        </View>
        {showChevron === true && onPress != null && (
          <Feather
            name="chevron-right"
            size={18}
            color="#777777"
            style={{ marginLeft: 8 }}
          />
        )}
      </AnimatedPressable>
      {onRemove && (
        <AnimatedPressable className="p-2 ml-2" onPress={onRemove}>
          <Feather
            name="x"
            size={14}
            color="#777777"
          />
        </AnimatedPressable>
      )}
    </View>
  );
};
