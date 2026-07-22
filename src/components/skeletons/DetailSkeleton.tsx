import { useWindowDimensions, View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";

export function DetailSkeleton() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const backdropHeight = windowHeight * 0.38;

  return (
    <View className="flex-1 bg-black">
      <View style={{ height: backdropHeight, width: windowWidth }}>
        <Skeleton width="100%" height={backdropHeight} borderRadius={0} />

        <View className="absolute top-16 left-5 w-12 h-12 rounded-full bg-black/60 items-center justify-center">
          <Skeleton width={24} height={24} borderRadius={4} />
        </View>

        <View className="absolute top-14 right-4 rounded-lg bg-neutral-950/80 px-2.5 py-1">
          <Skeleton width={70} height={11} borderRadius={2} />
        </View>

        <View className="absolute inset-0" style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <View className="flex-1 justify-end">
            <Skeleton width="75%" height={26} borderRadius={4} />
            <View className="flex-row flex-wrap gap-1.5 mt-2">
              <Skeleton width={60} height={22} borderRadius={6} />
              <Skeleton width={80} height={22} borderRadius={6} />
              <Skeleton width={50} height={22} borderRadius={6} />
            </View>
          </View>
        </View>
      </View>

      <View className="px-5 pt-5" style={{ gap: 8 }}>
        <Skeleton width={60} height={14} borderRadius={4} />
        <View style={{ gap: 6 }}>
          <Skeleton width="100%" height={14} borderRadius={4} />
          <Skeleton width="92%" height={14} borderRadius={4} />
          <Skeleton width="65%" height={14} borderRadius={4} />
        </View>
        <Skeleton width={80} height={14} borderRadius={4} />
      </View>

      <View className="pt-5 px-5">
        <Skeleton width={160} height={14} borderRadius={4} />
        <View className="flex-row gap-3 mt-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={`rel-${i}`} className="w-[100px]">
              <Skeleton width={100} height={140} borderRadius={10} />
              <Skeleton width="90%" height={12} borderRadius={4} className="mt-1" />
            </View>
          ))}
        </View>
      </View>

      <View className="flex-row items-center justify-between px-5 pt-6">
        <Skeleton width={130} height={16} borderRadius={4} />
        <Skeleton width={20} height={20} borderRadius={4} />
      </View>

      <View className="flex-row gap-3 px-5 mt-3 mb-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={`tab-${i}`} width={80} height={32} borderRadius={8} />
        ))}
      </View>

      <View className="px-5" style={{ marginTop: 4, gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={`ep-${i}`}
            className="flex-row items-center justify-between rounded-xl bg-neutral-950 border border-neutral-800 p-4"
          >
            <Skeleton width={100} height={15} borderRadius={4} />
            <Skeleton width={15} height={15} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}
