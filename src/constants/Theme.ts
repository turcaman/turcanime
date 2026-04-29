/**
 * Turcanime Minimalist Design System
 * Unified tokens for colors, spacing, and radius.
 */

export const Theme = {
  colors: {
    background: "#000000",
    surface: "#0A0A0A",
    surfaceElevated: "#1A1A1A",
    border: "#1F1F1F",
    black: "#000000",

    primary: "#A855F7", // Purple Accent
    primaryMuted: "rgba(168, 85, 247, 0.15)",
    error: "#EF4444", // Red for errors

    text: {
      primary: "#FFFFFF",
      secondary: "#AAAAAA",
      muted: "#777777",
      dark: "#444444",
      accent: "#A855F7",
    },

    status: {
      airing: "#A855F7",
      finished: "#777777",
    },

    overlay: {
      light: "rgba(0, 0, 0, 0.3)",  // Hero overlay
      dark: "rgba(0, 0, 0, 0.6)",   // Card overlays
      heavy: "rgba(0, 0, 0, 0.8)",
      glass: "rgba(255, 255, 255, 0.05)",
      scrim: ["rgba(0, 0, 0, 0.8)", "transparent"],
      gradient: ["transparent", "rgba(0, 0, 0, 0.5)", "#000000"] as const,
      mid: "rgba(0, 0, 0, 0.4)",
      midStrong: "rgba(0, 0, 0, 0.7)",
      scrimGradient: [
        "rgba(0, 0, 0, 0.4)",
        "rgba(0, 0, 0, 0.7)",
      ] as const,
    },
  },

  spacing: {
    xs: 4,    // Micro
    s: 8,     // Compact
    m: 16,    // Base
    l: 24,    // Comfortable
    xl: 32,   // Spacious
    xxl: 48,  // Sections
  },

  radius: {
    s: 4,     // 50% of xs spacing
    m: 8,     // 50% of s spacing
    l: 12,    // 50% of m spacing
    full: 9999,
  },

  fontSize: {
    xs: 10,   // Captions - standard
    s: 12,    // Labels - standard
    m: 15,    // Body - reduced but readable (minimum accessible 14)
    l: 17,    // Subtitles - compact
    xl: 20,   // Headings - mobile standard
    xxl: 24,  // Large - hero titles
    xxxl: 30, // Hero - maximum, prevents truncation
  },

  // Line height tokens - 1.35 ratio to compact without losing readability
  lineHeight: {
    xs: 14,   // 10 * 1.4 = 14
    s: 16,    // 12 * 1.35 = 16.2 → 16
    m: 20,    // 15 * 1.35 = 20.25 → 20
    l: 23,    // 17 * 1.35 = 22.95 → 23
    xl: 27,   // 20 * 1.35 = 27
    xxl: 32,  // 24 * 1.35 = 32.4 → 32
  },

  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    heavy: "800" as const,
  },

  transitions: {
    quick: 100,
    standard: 150,
  },

  // Unified spacing - Law of Proximity
  // All spacing derived from base 4px with semantic meaning
  space: {
    // Micro: Inside components (text to icon, badge padding)
    micro: 4,      // xs

    // Compact: Between related items (icon + text, card title to subtitle)
    compact: 8,    // s

    // Base: Between related components (cards in a row, list items)
    base: 12,      // NEW - bridges compact and comfortable

    // Comfortable: Standard padding inside sections
    comfortable: 16,  // m

    // Generous: Section edges, hero horizontal padding
    generous: 20,  // NEW - consistent edge padding across all screens

    // Spacious: Between major sections
    spacious: 20,  // reducido de 24

    // Section breaks: Between page sections
    section: 24,   // reducido de 28
  },

  // Layout tokens - unified edge system
  // ALL screens use the same horizontal edge padding for alignment
  edge: {
    horizontal: 20,  // UNIFIED: search, home, details, all use same
  },

  // Component spacing - semantic by relationship type
  component: {
    // Inside components (padding within)
    inner: 4,      // micro - inside badges, small elements
    innerMd: 8,    // compact - inside cards, buttons
    innerLg: 12,   // base - inside modals, large containers

    // Between related components (gap between)
    gapSm: 8,      // compact - between card title and subtitle
    gapMd: 12,     // base - between cards in horizontal list
    gapLg: 16,     // comfortable - between sections

    // Section spacing (margins)
    sectionGap: 20,     // generous - between MediaSections
    heroBottom: 20,     // generous - after hero
  },

  // Screen-specific overrides (minimal, for truly special cases)
  screen: {
    search: {
      gridColumnGap: 10,  // Horizontal between cards - slightly tighter
      gridRowGap: 8,      // Vertical between rows - compact but breathable
    },
    hero: {
      bottomPadding: 20,  // Space for title
    },
  },

  // Dimension tokens - fixed sizes that repeat across components
  dimensions: {
    // Input heights
    inputHeight: 48,  // Standard touch target height

    // Icon/button sizes
    iconSm: 14,
    iconMd: 18,
    iconLg: 20,
    touchTarget: 48,  // Minimum touch target (iOS/Android guidelines)

    // Card dimensions
    cardPosterSm: { width: 40, height: 56 },  // Suggestions
    cardPosterMd: { width: 110, height: 165 },  // Continue watching

    // Button/action sizes
    backButton: 48,  // Square back button
    modalHandle: { width: 36, height: 4, radius: 2 },  // Small radius for handle
    playIcon: { width: 28, height: 28 },

    // Loading/empty states
    minHeight: 400,  // Minimum height for loading states
    loaderHeight: 200,  // Loader area height

    // Episode range selector
    episodeRangeBadge: { width: 90, gap: 12 },
  },

  // Border tokens
  borders: {
    thin: 1,
  },

  // Layout offsets
  offsets: {
    tabBarBottom: 20,  // Space below tab bar for last item
  },
};
