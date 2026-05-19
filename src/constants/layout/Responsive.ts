export const Breakpoints = {
  sm: 375,  // iPhone SE
  md: 768,  // iPad mini
  lg: 1024, // iPad
  xl: 1440, // Desktop
} as const;

export type BreakpointKey = keyof typeof Breakpoints;

export const getBreakpoint = (width: number): BreakpointKey => {
  if (width >= Breakpoints.xl) return 'xl';
  if (width >= Breakpoints.lg) return 'lg';
  if (width >= Breakpoints.md) return 'md';
  return 'sm';
};
