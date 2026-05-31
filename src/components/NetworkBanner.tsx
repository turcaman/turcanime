import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Modal, Text, View } from "react-native";
import { AnimatedPressable } from "./AnimatedPressable";

interface NetworkBannerProps {
  visible: boolean;
  onRetry?: () => void;
}

export const NetworkBanner = ({ visible, onRetry }: NetworkBannerProps) => {
  useEffect(() => {
    if (!visible && onRetry) {
      const timer = setTimeout(() => {
        onRetry();
      }, 500);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [visible, onRetry]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View className="flex-1 items-center justify-center bg-black p-5">
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
      </View>
    </Modal>
  );
};
