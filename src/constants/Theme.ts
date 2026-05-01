/**
 * Turcanime Minimalist Design System
 * Consolidated theme from modular token files.
 */

import { CardDimensions } from "./components/CardDimensions";
import { ColorTokens } from "./design/ColorTokens";
import { DimensionTokens } from "./design/DimensionTokens";
import { SpacingTokens } from "./design/SpacingTokens";
import { TypographyTokens } from "./design/TypographyTokens";

export const Theme = {
  colors: ColorTokens,
  fontSize: TypographyTokens.fontSize,
  lineHeight: TypographyTokens.lineHeight,
  fontWeight: TypographyTokens.fontWeight,
  letterSpacing: TypographyTokens.letterSpacing,
  spacing: SpacingTokens,
  radius: DimensionTokens.radius,
  transitions: DimensionTokens.transitions,
  edge: DimensionTokens.edge,
  borders: DimensionTokens.borders,
  dimensions: CardDimensions,
} as const;
