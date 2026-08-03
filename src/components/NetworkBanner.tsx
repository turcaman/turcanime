import { MUTED_ICON } from "@/config/source";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, View } from "react-native";

interface NetworkBannerProps {
  visible: boolean;
}

export const NetworkBanner = ({ visible }: NetworkBannerProps) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View className="flex-1 items-center justify-center bg-black p-5">
        <View className="items-center">
          <Feather name="wifi-off" size={48} color={MUTED_ICON} />
          <Text className="mt-2 text-lg font-bold text-white">
            Sin conexión
          </Text>
          <Text className="mt-2 text-center text-base text-neutral-500">
            Conectate a internet para continuar
          </Text>
        </View>
      </View>
    </Modal>
  );
};
