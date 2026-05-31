import { AppLoader } from "@/components/ui/AppLoader";
import { ErrorState } from "@/components/ui/ErrorState";
import { ThemedView } from "@/components/ui/ThemedView";
import type { ReactNode } from "react";

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
      <ThemedView style={{ flex: 1 }}>
        <AppLoader variant="full" />
      </ThemedView>
    );
  }

  if (!hasContent && error && onRetry) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <ErrorState onRetry={onRetry} />
      </ThemedView>
    );
  }

  return <>{children}</>;
}
