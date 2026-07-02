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
      <Skeleton width={140} height={16} borderRadius={4} className="mb-4" />
      <View className="flex-row gap-3 mb-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <View key={`cw-${i}`} style={{ width: 110 }}>
            <Skeleton width={110} height={165} borderRadius={8} />
            <Skeleton width="90%" height={12} borderRadius={4} className="mt-2" />
            <Skeleton width="60%" height={10} borderRadius={4} className="mt-1" />
          </View>
        ))}
      </View>

      <Skeleton width={160} height={16} borderRadius={4} className="mb-4" />

      <View style={{ gap: 14 }}>
        {Array.from({ length: 2 }).map((_, rowIdx) => (
          <View key={`row-${rowIdx}`} style={{ flexDirection: "row", gap: CARD_WIDTH_CONFIG.gap }}>
            {Array.from({ length: CARD_WIDTH_CONFIG.columns }).map((_, colIdx) => (
              <View key={`card-${rowIdx}-${colIdx}`} style={{ width: cardWidth }}>
                <Skeleton width={cardWidth} height={cardHeight} borderRadius={8} />
                <View className="mt-2 px-0.5" style={{ gap: 4 }}>
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
