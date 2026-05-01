export const CardDimensions = {
  poster: {
    sm: { width: 40, height: 56 },
    md: { width: 110, height: 165 },
  } as const,
  
  ratios: {
    default: 1.5, // Default anime card height ratio
    continue: 0.6, // Continue watching card height ratio
    hero: 0.62, // Hero height as ratio of screen width
  } as const,

  input: {
    height: 48,
  } as const,

  icon: {
    sm: 14,
    md: 18,
    lg: 20,
  } as const,

  touch: {
    target: 48,
  } as const,

  modal: {
    handle: { width: 36, height: 4, radius: 2 },
  } as const,

  player: {
    playIcon: { width: 28, height: 28 },
  } as const,

  layout: {
    minHeight: 400,
    loaderHeight: 200,
    episodeRangeBadge: { width: 90, gap: 12 },
    backButton: 48,
  } as const,
} as const;
