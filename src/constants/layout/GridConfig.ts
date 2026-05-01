export const GridConfig = {
  search: {
    columns: 3,
    gaps: {
      column: 10,
      row: 8,
    },
  } as const,
  
  carousel: {
    itemGap: 12,
  } as const,

  tabbar: {
    floatingIslandHeight: 100,
    bottomOffset: 16, // Spacing.lg
  } as const,
} as const;
