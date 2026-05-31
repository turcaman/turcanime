import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { Theme } from "../constants/Theme";
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
        {/* Hero Image */}
        <View
          className="overflow-hidden"
          style={{ height: windowHeight * 0.35, width: windowWidth }}
        >
          <ImageWithLoader
            uri={anime?.banner ?? anime?.poster ?? ''}
            className="absolute inset-0 w-full h-full"
          />
          <LinearGradient
            colors={Theme.colors.overlay.detailsHero}
            locations={[0.05, 0.35, 0.7, 1]}
            style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 20, paddingTop: insets.top }]}
          >
            {/* Back Button */}
            <AnimatedPressable
              onPress={onBackPress}
              className="absolute top-0 left-5 w-12 h-12 rounded-full bg-black/60 items-center justify-center"
              style={{ marginTop: insets.top }}
            >
              <Feather
                name="arrow-left"
                size={24}
                color={Theme.colors.text.primary}
              />
            </AnimatedPressable>

            {/* Status Badge - Top Right */}
            <View
              className={`absolute right-5 px-2 py-1 rounded-lg ${isAiring ? "bg-purple-500/20" : "bg-black/60"}`}
              style={{ top: insets.top }}
            >
              <Text
                className={`text-[10px] font-bold tracking-wider leading-[14px] ${isAiring ? "text-purple-500" : "text-white"}`}
              >
                {(isAiring ? "En emisión" : "Finalizado").toUpperCase()}
              </Text>
            </View>

            {/* Title */}
            <View className="flex-1 justify-end">
              <Text className="text-2xl font-extrabold tracking-tight text-white" numberOfLines={2}>
                {anime?.title}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Synopsis */}
        <View className="px-5 py-5">
          <SectionTitle>Sinopsis</SectionTitle>
          {hasSynopsis ? (
            <AnimatedPressable onPress={() => { setIsExpanded(!isExpanded); }}>
              <Text
                className="text-[15px] font-medium leading-5 text-neutral-400"
                numberOfLines={isExpanded ? undefined : 3}
              >
                {anime.synopsis}
              </Text>
              {!isExpanded && anime.synopsis.length > 150 && (
                <Text className="mt-2 text-[15px] font-bold leading-5 text-purple-500">
                  Leer más
                </Text>
              )}
            </AnimatedPressable>
          ) : (
            <Text className="text-[10px] font-semibold tracking-wider leading-[14px] text-neutral-400">
              Sinopsis no disponible
            </Text>
          )}
        </View>

        {/* Episodes Header */}
        <View className="flex-row items-center justify-between px-5 pt-3">
          <SectionTitle>Episodios ({anime?.episodes.length ?? 0})</SectionTitle>
          <AnimatedPressable onPress={toggleSort}>
            <Feather
              name={isAscending ? "chevron-up" : "chevron-down"}
              size={20}
              color={Theme.colors.primary}
            />
          </AnimatedPressable>
        </View>
      </>
    );
  },
);

AnimeDetailsHeader.displayName = "AnimeDetailsHeader";
