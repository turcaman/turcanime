import { AppLoader } from "@/components/ui/AppLoader";
import { ErrorState } from "@/components/ui/ErrorState";
import type { ReactNode } from "react";
import { View } from "react-native";

interface ScreenWrapperProps {
  isLoading: boolean;
  error: boolean;
  hasContent: boolean;
  onRetry?: () => void;
  children: ReactNode;
}

export function ScreenWrapper({
  isLoading,
  error,
  hasContent,
  onRetry,
  children
}: ScreenWrapperProps) {
  if (isLoading) {
    return (
      <View className="flex-1 bg-black">
        <AppLoader variant="full" />
      </View>
    );
  }

  if (!hasContent && error && onRetry) {
    return (
      <View className="flex-1 bg-black">
        <ErrorState onRetry={onRetry} />
      </View>
    );
  }

  return <>{children}</>;
}
