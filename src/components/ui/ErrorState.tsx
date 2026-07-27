import { ACCENT_COLOR, MUTED_ICON } from "@/config/source";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";

interface ErrorStateProps {
  onRetry: () => void;
  title?: string;
}

export function ErrorState({ onRetry, title = "Error al cargar" }: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center bg-black px-5">
      <Feather name="alert-circle" size={48} color={MUTED_ICON} />
      <Text className="mt-2 text-lg font-bold text-neutral-500">
        {title}
      </Text>
      <AnimatedPressable className="mt-4 flex-row items-center px-6 py-3 rounded-xl bg-purple-500/15" onPress={onRetry}>
        <Feather name="refresh-cw" size={16} color={ACCENT_COLOR} />
        <Text className="ml-2 text-xs font-semibold tracking-wide text-purple-500">
          Reintentar
        </Text>
      </AnimatedPressable>
    </View>
  );
}
