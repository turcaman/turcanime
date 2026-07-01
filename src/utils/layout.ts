export const TAB_BAR_OFFSET = 116;

export const CARD_WIDTH_CONFIG = { columns: 3, gap: 12, horizontalPad: 20, min: 80, max: 400 };

export function calcCardWidth(screenWidth: number): number {
  const { columns, gap, horizontalPad, min, max } = CARD_WIDTH_CONFIG;
  const available = screenWidth - horizontalPad * 2 - gap * (columns - 1);
  return Math.max(min, Math.min(available / columns, max));
}
