export const SpacingTokens = {
  // Base unit: 4px, semantic naming by use case
  xs: 4,      // Micro - inside tiny components (badges, small icons)
  sm: 8,      // Compact - gaps between related items (icon + text)
  md: 12,     // Base - padding between related components
  lg: 16,     // Comfortable - standard padding inside sections
  xl: 20,     // Generous - section edges, hero horizontal padding
  xxl: 24,    // Spacious - between major sections
  xxxl: 32,   // Extra spacious - large separations
  xxxxl: 48,  // Hero - maximum spacing for hero elements
} as const;
