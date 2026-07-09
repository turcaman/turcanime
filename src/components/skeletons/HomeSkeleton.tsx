import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Skeleton } from "@/components/ui/Skeleton";
import { calcCardWidth, CARD_WIDTH_CONFIG } from "@/utils/layout";

export function HomeSkeleton() {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardWidth = calcCardWidth(screenWidth);
  const cardHeight = cardWidth * 1.4;

  return (
    <View className="flex-1 bg-black" style={{ paddingHorizontal: CARD_WIDTH_CONFIG.horizontalPad, paddingTop: insets.top + 16 }}>
      {/* Continue Watching section */}
      <Skeleton width={140} height={14} borderRadius={4} />
      <View className="mb-3" />
      <View className="flex-row gap-3 mb-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <View key={`cw-${i}`} className="w-[110px] h-[165px] rounded-xl overflow-hidden bg-neutral-950">
            <Skeleton width={110} height={165} borderRadius={0} />
            <View className="absolute bottom-0 left-0 right-0 bg-neutral-950/80 px-2 pb-2 pt-1.5">
              <Skeleton width={50} height={10} borderRadius={2} className="mb-0.5" />
              <Skeleton width="85%" height={13} borderRadius={3} />
              <View className="h-0.5 bg-neutral-800 mt-1 rounded-full overflow-hidden">
                <Skeleton width="40%" height={2} borderRadius={0} />
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Recién agregados section */}
      <Skeleton width={160} height={14} borderRadius={4} />
      <View className="mb-3" />
      <View style={{ gap: 12 }}>
        {Array.from({ length: 2 }).map((_, rowIdx) => (
          <View key={`row-${rowIdx}`} style={{ flexDirection: "row", gap: CARD_WIDTH_CONFIG.gap }}>
            {Array.from({ length: CARD_WIDTH_CONFIG.columns }).map((_, colIdx) => (
              <View key={`card-${rowIdx}-${colIdx}`} style={{ width: cardWidth }}>
                <Skeleton width={cardWidth} height={cardHeight} borderRadius={8} />
                <View className="mt-2" style={{ gap: 4 }}>
                  <Skeleton width="85%" height={13} borderRadius={4} />
                  <Skeleton width="55%" height={11} borderRadius={4} />
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
