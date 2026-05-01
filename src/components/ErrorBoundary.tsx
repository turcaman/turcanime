/**
 * Error Boundary component to catch React rendering errors
 * and display a fallback UI instead of crashing the app.
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Theme } from "../constants/Theme";
import { logger } from "../lib/utils/logger";

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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
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

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>😵</Text>
          <Text style={styles.title}>Algo salió mal</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "Error inesperado"}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.xl,
  },
  emoji: {
    fontSize: Theme.fontSize.xxl,
    marginBottom: Theme.spacing.sm,
  },
  title: {
    fontSize: Theme.fontSize.l,
    fontWeight: "bold",
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.sm,
  },
  message: {
    fontSize: Theme.fontSize.m,
    color: Theme.colors.text.secondary,
    textAlign: "center",
    marginBottom: Theme.spacing.xl,
  },
  button: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.m,
  },
  buttonText: {
    color: "#fff",
    fontSize: Theme.fontSize.m,
    fontWeight: Theme.fontWeight.semibold,
  },
});
