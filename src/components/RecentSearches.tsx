import { MUTED_ICON } from "@/config/source";
import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { SectionTitle } from "./ui/SectionTitle";

interface RecentSearchesProps {
  searches: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClearAll?: () => void;
}

export const RecentSearches = memo(({ searches, onSelect, onRemove, onClearAll }: RecentSearchesProps) => {
  if (searches.length === 0) return null;

  return (
    <View className="mt-3 pb-20">
      <View className="flex-row items-center justify-between">
        <SectionTitle>Búsquedas recientes</SectionTitle>
        {onClearAll && (
          <AnimatedPressable onPress={onClearAll}>
            <Text className="text-xs font-semibold text-purple-500">Limpiar</Text>
          </AnimatedPressable>
        )}
      </View>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {searches.map((term) => (
          <AnimatedPressable
            key={term}
            onPress={() => { onSelect(term); }}
            className="max-w-full flex-row items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 py-2.5 pl-3 pr-2"
            accessibilityLabel={`Buscar: ${term}`}
          >
            <Feather name="clock" size={14} color={MUTED_ICON} />
            <Text className="text-sm text-neutral-200" numberOfLines={1} style={{ flexShrink: 1 }}>
              {term}
            </Text>
            <AnimatedPressable
              className="p-2"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={(e) => { e.stopPropagation(); onRemove(term); }}
              accessibilityLabel={`Eliminar búsqueda: ${term}`}
            >
              <Feather name="x" size={14} color={MUTED_ICON} />
            </AnimatedPressable>
          </AnimatedPressable>
        ))}
      </View>
    </View>
  );
});

RecentSearches.displayName = "RecentSearches";
