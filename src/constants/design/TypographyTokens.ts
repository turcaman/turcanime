export const TypographyTokens = {
  fontSize: {
    xs: 10,
    s: 12,
    m: 15,
    l: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  } as const,

  lineHeight: {
    xs: 14,
    s: 16,
    m: 20,
    l: 23,
    xl: 27,
    xxl: 32,
  } as const,

  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    heavy: "800" as const,
  } as const,

  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1.5,
  } as const,
} as const;
