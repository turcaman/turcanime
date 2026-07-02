import { View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";

export function DetailSkeleton() {
  return (
    <View className="flex-1 bg-black">
      <View className="relative">
        <Skeleton width="100%" height={260} borderRadius={0} />
        <View className="absolute bottom-0 left-0 right-0 h-24 bg-black/60" />
        <View className="absolute bottom-0 left-0 right-0 px-5 pb-5 flex-row items-end">
          <View className="rounded-lg overflow-hidden" style={{ width: 100, height: 150 }}>
            <Skeleton width={100} height={150} borderRadius={0} />
          </View>
          <View className="flex-1 ml-4 mb-2" style={{ gap: 8 }}>
            <Skeleton width="80%" height={20} borderRadius={4} />
            <Skeleton width="45%" height={14} borderRadius={4} />
            <View className="flex-row gap-2">
              <Skeleton width={60} height={22} borderRadius={6} />
              <Skeleton width={70} height={22} borderRadius={6} />
            </View>
          </View>
        </View>
      </View>

      <View className="px-5 mt-5" style={{ gap: 6 }}>
        <Skeleton width="100%" height={14} borderRadius={4} />
        <Skeleton width="92%" height={14} borderRadius={4} />
        <Skeleton width="65%" height={14} borderRadius={4} />
      </View>

      <View className="flex-row gap-2 px-5 mt-4">
        <Skeleton width={70} height={24} borderRadius={6} />
        <Skeleton width={50} height={24} borderRadius={6} />
        <Skeleton width={80} height={24} borderRadius={6} />
      </View>

      <View className="mt-5 mb-2 px-5">
        <Skeleton width={180} height={16} borderRadius={4} className="mb-3" />
        <View className="flex-row gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={`rel-${i}`} style={{ width: 100 }}>
              <Skeleton width={100} height={140} borderRadius={8} />
            </View>
          ))}
        </View>
      </View>

      <View className="flex-row gap-3 px-5 mt-4 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={`tab-${i}`} width={80} height={32} borderRadius={8} />
        ))}
      </View>

      <View className="px-5" style={{ gap: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={`ep-${i}`}
            className="flex-row items-center justify-between rounded-xl bg-neutral-950 border border-neutral-800 px-4"
            style={{ height: 56 }}
          >
            <Skeleton width={100} height={15} borderRadius={4} />
            <Skeleton width={15} height={15} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}
