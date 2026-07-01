import { View } from "react-native";

interface DarkOverlayProps {
  zIndex?: number;
  elevation?: number;
}

export function DarkOverlay({ zIndex, elevation }: DarkOverlayProps) {
  return (
    <View
      style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        ...(zIndex != null ? { zIndex } : {}),
        ...(elevation != null ? { elevation } : {}),
      }}
      pointerEvents="none"
    />
  );
}
