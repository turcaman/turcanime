/**
 * Error Boundary component to catch React rendering errors
 * and display a fallback UI instead of crashing the app.
 */

import { Feather } from "@expo/vector-icons";
import React, { type ErrorInfo, type ReactNode, Component } from "react";
import { Pressable, Text, View } from "react-native";
import { logger } from "../utils/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnRetry?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("ErrorBoundary", `Component error: ${error.message}`, error);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.props.resetOnRetry !== false) {
      this.setState({ hasError: false, error: null });
    }
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback != null && this.props.fallback !== false) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 items-center justify-center bg-black px-5">
          <Feather name="alert-circle" size={48} color="#737373" />
          <Text className="mt-2 text-lg font-bold text-white">Algo salió mal</Text>
          <Text className="text-neutral-500">
            {this.state.error?.message ?? "Error inesperado"}
          </Text>
          <Pressable
            className="flex-row items-center mt-4 bg-purple-500/15 px-6 py-3 rounded-xl"
            onPress={this.handleRetry}
          >
            <Text className="font-semibold text-purple-500">Reintentar</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
