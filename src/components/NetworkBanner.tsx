import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Modal, Text, View } from "react-native";
import { AnimatedPressable } from "./AnimatedPressable";

interface NetworkBannerProps {
  visible: boolean;
  onRetry?: () => void;
  /** When false, renders as a non-blocking overlay instead of a Modal (for the player screen). */
  blocking?: boolean;
}

const NetworkContent = ({ onRetry }: { onRetry?: () => void }) => (
  <View className="items-center">
    <Feather name="wifi-off" size={48} color="#737373" />
    <Text className="mt-2 text-lg font-bold text-white">
      Sin conexión
    </Text>
    <Text className="mt-2 text-center text-base text-neutral-500">
      Conectate a internet para continuar
    </Text>
    {onRetry && (
      <AnimatedPressable className="mt-5 flex-row items-center p-4" onPress={onRetry}>
        <Feather name="refresh-cw" size={18} color="#A855F7" />
        <Text className="ml-2 text-base text-purple-500">
          Intentar de nuevo
        </Text>
      </AnimatedPressable>
    )}
  </View>
);

export const NetworkBanner = ({ visible, onRetry, blocking = true }: NetworkBannerProps) => {
  useEffect(() => {
    if (!visible && onRetry) {
      const timer = setTimeout(() => {
        onRetry();
      }, 500);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [visible, onRetry]);

  if (!visible) return null;

  if (!blocking) {
    return (
      <View className="absolute inset-0 z-50 items-center justify-center bg-black/70" pointerEvents="none">
        <NetworkContent onRetry={onRetry} />
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View className="flex-1 items-center justify-center bg-black p-5">
        <NetworkContent onRetry={onRetry} />
      </View>
    </Modal>
  );
};
