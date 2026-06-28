import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import type { AnimeDetail } from "../lib/domain/entities";
import { AnimatedPressable } from "./AnimatedPressable";
import { ImageWithLoader } from "./ui/ImageWithLoader";
import { SectionTitle } from "./ui/SectionTitle";

interface AnimeDetailsHeaderProps {
  anime: AnimeDetail | null;
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
  isAscending: boolean;
  toggleSort: () => void;
  insets: EdgeInsets;
  onBackPress?: () => void;
}

export const AnimeDetailsHeader = memo(
  ({
    anime,
    isExpanded,
    setIsExpanded,
    isAscending,
    toggleSort,
    insets,
    onBackPress,
  }: AnimeDetailsHeaderProps) => {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const hasSynopsis = anime?.synopsis != null && anime.synopsis.length > 0;
    const statusLower = anime?.status.toLowerCase();
    const isAiring = statusLower != null && (statusLower.includes("emisión") || statusLower.includes("emision"));

    return (
      <>
        <View
          className="overflow-hidden"
          style={{ height: windowHeight * 0.38, width: windowWidth }}
        >
          <ImageWithLoader
            uri={anime?.banner ?? anime?.poster ?? ''}
            className="absolute inset-0 w-full h-full"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.40)","rgba(0,0,0,0.15)","rgba(0,0,0,0.50)","rgba(0,0,0,0.97)"]}
            locations={[0.05, 0.35, 0.6, 1]}
            style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 20, paddingTop: insets.top }]}
          >
            <AnimatedPressable
              onPress={onBackPress}
              className="absolute top-0 left-5 w-12 h-12 rounded-full bg-black/60 items-center justify-center"
              style={{ marginTop: insets.top }}
            >
              <Feather name="arrow-left" size={24} color="#FFFFFF" />
            </AnimatedPressable>

            <View
              className={`absolute right-5 px-2 py-1 rounded-lg ${isAiring ? "bg-purple-600/90 ring-1 ring-purple-400/30" : "bg-black/60"}`}
              style={{ top: insets.top }}
            >
              <Text
                className="text-[10px] font-bold tracking-wider leading-none text-white"
              >
                {(isAiring ? "En emisión" : "Finalizado").toUpperCase()}
              </Text>
            </View>

            <View className="flex-1 justify-end">
              <Text className="text-2xl font-extrabold tracking-tight text-white" numberOfLines={2}>
                {anime?.title}
              </Text>

              {anime?.genres != null && anime.genres.length > 0 && (
                <View className="flex-row flex-wrap gap-1.5 mt-2">
                  {anime.genres.map((genre) => (
                    <View
                      key={genre}
                      className="rounded-md bg-white/10 px-2.5 py-1"
                    >
                      <Text className="text-[9px] font-bold uppercase tracking-wider text-white/80">
                        {genre}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        <View className="px-5 pt-5">
          <SectionTitle>Sinopsis</SectionTitle>
          {hasSynopsis ? (
            <AnimatedPressable onPress={() => { setIsExpanded(!isExpanded); }}>
              <Text
                className="text-sm font-medium leading-6 text-neutral-400 mt-2"
                numberOfLines={isExpanded ? undefined : 3}
              >
                {anime.synopsis}
              </Text>
              {!isExpanded && anime.synopsis.length > 150 && (
                <Text className="mt-2 text-sm font-bold leading-6 text-purple-500">
                  Leer más
                </Text>
              )}
            </AnimatedPressable>
          ) : (
            <Text className="text-[10px] font-semibold tracking-wider leading-none text-neutral-400 mt-2">
              Sinopsis no disponible
            </Text>
          )}
        </View>

        <View className="flex-row items-center justify-between px-5 pt-6">
          <SectionTitle>Episodios ({anime?.episodes.length ?? 0})</SectionTitle>
          <AnimatedPressable onPress={toggleSort}>
            <Feather
              name={isAscending ? "chevron-up" : "chevron-down"}
              size={20}
              color="#A855F7"
            />
          </AnimatedPressable>
        </View>
      </>
    );
  },
);

AnimeDetailsHeader.displayName = "AnimeDetailsHeader";
