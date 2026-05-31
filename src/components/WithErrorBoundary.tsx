import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { ReactNode } from "react";

interface WithErrorBoundaryProps {
  children: ReactNode;
}

export function WithErrorBoundary({ children }: WithErrorBoundaryProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
