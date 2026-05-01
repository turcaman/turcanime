export const ColorTokens = {
  background: "#000000",
  surface: "#0A0A0A",
  surfaceElevated: "#1A1A1A",
  border: "#1F1F1F",
  black: "#000000",

  primary: "#A855F7",
  primaryMuted: "rgba(168, 85, 247, 0.15)",
  error: "#EF4444",

  text: {
    primary: "#FFFFFF",
    secondary: "#AAAAAA",
    muted: "#777777",
    dark: "#444444",
    accent: "#A855F7",
  } as const,

  status: {
    airing: "#A855F7",
    finished: "#777777",
  } as const,

  overlay: {
    light: "rgba(0, 0, 0, 0.3)",
    dark: "rgba(0, 0, 0, 0.6)",
    heavy: "rgba(0, 0, 0, 0.8)",
    glass: "rgba(255, 255, 255, 0.05)",
    scrim: ["rgba(0, 0, 0, 0.8)", "transparent"] as const,
    gradient: ["transparent", "rgba(0, 0, 0, 0.5)", "#000000"] as const,
    mid: "rgba(0, 0, 0, 0.4)",
    midStrong: "rgba(0, 0, 0, 0.7)",
    scrimGradient: [
      "rgba(0, 0, 0, 0.4)",
      "rgba(0, 0, 0, 0.7)",
    ] as const,
    homeHero: ["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.7)", "#000000"] as const,
    detailsHero: ["rgba(0,0,0,0.35)", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.98)"] as const,
  } as const,
} as const;
