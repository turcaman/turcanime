import { Dimensions } from "react-native";
import { SpacingTokens } from "../constants/design/SpacingTokens";
import { GridConfig } from "../constants/layout/GridConfig";
import { BreakpointKey, getBreakpoint } from "../constants/layout/Responsive";

export interface ScreenInfo {
  width: number;
  height: number;
  breakpoint: BreakpointKey;
}

export const getScreenInfo = (): ScreenInfo => {
  const { width, height } = Dimensions.get("window");
  return {
    width,
    height,
    breakpoint: getBreakpoint(width),
  };
};

export const calculateSearchCardWidth = (screenWidth?: number): number => {
  const width = screenWidth ?? getScreenInfo().width;
  const config = GridConfig.search;

  // Validate inputs with reasonable bounds
  if (width <= 0 || width > 10000 || config.columns <= 0) {
    throw new Error("Invalid screen width or grid configuration");
  }

  const gap = config.gaps.column;
  const horizontalPad = SpacingTokens.xl; // edge.horizontal

  // Calculate: (screenWidth - padding - gaps) / columns
  const totalPadding = horizontalPad * 2;
  const totalGaps = gap * (config.columns - 1);
  const availableWidth = width - totalPadding - totalGaps;

  const cardWidth = availableWidth / config.columns;

  // Ensure reasonable card width bounds
  const minCardWidth = 80;
  const maxCardWidth = 400;

  if (cardWidth < minCardWidth) {
    console.warn(`Calculated card width (${cardWidth}px) is below minimum (${minCardWidth}px)`);
  }

  if (cardWidth > maxCardWidth) {
    console.warn(`Calculated card width (${cardWidth}px) exceeds maximum (${maxCardWidth}px)`);
  }

  return Math.max(minCardWidth, Math.min(cardWidth, maxCardWidth));
};

export const calculateTabBarOffset = (): number => {
  return SpacingTokens.lg + GridConfig.tabbar.floatingIslandHeight;
};

export const validateDimensions = (dimensions: { width: number; height: number }): boolean => {
  return dimensions.width > 0 && dimensions.height > 0;
};

export const clampValue = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};
