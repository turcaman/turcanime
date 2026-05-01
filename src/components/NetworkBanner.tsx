import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { Theme } from "../constants/Theme";
import { AnimatedPressable } from "./AnimatedPressable";
import { ThemedText } from "./ui/ThemedText";

interface NetworkBannerProps {
  visible: boolean;
  onRetry?: () => void;
}

export const NetworkBanner = ({ visible, onRetry }: NetworkBannerProps) => {
  // Auto-retry when reconnection detected
  useEffect(() => {
    if (!visible && onRetry) {
      // Small delay to ensure connection is stable
      const timer = setTimeout(() => {
        onRetry();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visible, onRetry]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Feather name="wifi-off" size={48} color={Theme.colors.text.muted} />
          <ThemedText variant="h3" style={styles.title}>
            Sin conexión
          </ThemedText>
          <ThemedText variant="body" color="muted" style={styles.subtitle}>
            Conectate a internet para continuar
          </ThemedText>
          {onRetry && (
            <AnimatedPressable style={styles.button} onPress={onRetry}>
              <Feather name="refresh-cw" size={18} color={Theme.colors.primary} />
              <ThemedText variant="body" color="accent" style={styles.buttonText}>
                Intentar de nuevo
              </ThemedText>
            </AnimatedPressable>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  container: {
    alignItems: 'center',
  },
  title: {
    marginTop: Theme.spacing.sm,
  },
  subtitle: {
    marginTop: Theme.spacing.sm,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.xl,
    padding: Theme.spacing.lg,
  },
  buttonText: {
    marginLeft: Theme.spacing.sm,
  },
});
