import { calculateSearchCardWidth, calculateTabBarOffset } from "../utils/layoutCalculations";
import { GridConfig } from "./layout/GridConfig";

/** Bottom offset so the last list item clears the floating tab bar. */
export const TAB_BAR_BOTTOM_OFFSET = calculateTabBarOffset();

/** Width of a single card in the search grid. */
export const searchGridCardWidth = calculateSearchCardWidth;

/** Grid configuration for reference. */
export { GridConfig };
