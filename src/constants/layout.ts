import { Dimensions } from "react-native";
import { Theme } from "./Theme";

/** Bottom offset so the last list item clears the floating tab bar. */
export const TAB_BAR_BOTTOM_OFFSET = Theme.spacing.lg + 100; // 16 + 60 for the floating island

/** Layout constants for search grid and card sizing. */
const SEARCH_COLUMNS = 3;

/** Width of a single card in the 3-column search grid. */
export function searchGridCardWidth(screenWidth = Dimensions.get("window").width): number {
  const gap = Theme.screen.search.gridColumnGap;
  const horizontalPad = Theme.edge.horizontal;
  return (screenWidth - horizontalPad * 2 - gap * (SEARCH_COLUMNS - 1)) / SEARCH_COLUMNS;
}
