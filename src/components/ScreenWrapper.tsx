import { ErrorState } from "@/components/ui/ErrorState";
import type { ReactNode } from "react";

interface ScreenWrapperProps {
  error: boolean;
  hasContent: boolean;
  onRetry?: () => void;
  children: ReactNode;
}

export function ScreenWrapper({
  error,
  hasContent,
  onRetry,
  children,
}: ScreenWrapperProps) {
  if (!hasContent && error && onRetry) {
    return <ErrorState onRetry={onRetry} />;
  }

  return <>{children}</>;
}
