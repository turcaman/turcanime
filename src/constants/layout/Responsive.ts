export const Breakpoints = {
  sm: 375,  // iPhone SE
  md: 768,  // iPad mini
  lg: 1024, // iPad
  xl: 1440, // Desktop
} as const;

export type BreakpointKey = keyof typeof Breakpoints;

export const createResponsiveValue = <T>(
  values: Partial<Record<BreakpointKey, T>>,
  defaultValue: T
) => ({
  values,
  defaultValue,
});

export const getBreakpoint = (width: number): BreakpointKey => {
  if (width >= Breakpoints.xl) return 'xl';
  if (width >= Breakpoints.lg) return 'lg';
  if (width >= Breakpoints.md) return 'md';
  return 'sm';
};

export const getResponsiveValue = <T>(
  responsive: ReturnType<typeof createResponsiveValue<T>>,
  screenWidth: number
): T => {
  const breakpoint = getBreakpoint(screenWidth);
  
  // Return value for current breakpoint or fallback to smaller breakpoints
  const breakpointOrder: BreakpointKey[] = ['xl', 'lg', 'md', 'sm'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (responsive.values[bp] !== undefined) {
      return responsive.values[bp]!;
    }
  }
  
  return responsive.defaultValue;
};
