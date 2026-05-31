import { useWindowDimensions } from "react-native";

export const useSearchCardWidth = (): number => {
  const { width } = useWindowDimensions();

  if (width <= 0 || width > 10000) {
    throw new Error("Invalid screen width or grid configuration");
  }

  const columns = 3;
  const gap = 10;
  const horizontalPad = 20;
  const minCardWidth = 80;
  const maxCardWidth = 400;

  const totalPadding = horizontalPad * 2;
  const totalGaps = gap * (columns - 1);
  const availableWidth = width - totalPadding - totalGaps;
  const cardWidth = availableWidth / columns;

  return Math.max(minCardWidth, Math.min(cardWidth, maxCardWidth));
};
