import React from "react";
import { View } from "react-native";

interface ProgressBarProps {
  progress?: number;
  duration?: number;
  color?: string;
  className?: string;
}

export function ProgressBar({ progress, duration, color, className }: ProgressBarProps) {
  const pct = progress != null && duration != null && duration > 0
    ? Math.min(progress / duration, 1)
    : 0;

  return (
    <View className={`h-0.5 bg-neutral-800 ${className ?? ""}`}>
      <View className="h-full" style={{ width: `${pct * 100}%`, backgroundColor: color ?? "#A855F7" }} />
    </View>
  );
}
