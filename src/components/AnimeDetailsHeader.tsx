import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { Theme } from "../constants/Theme";
import type { AnimeDetail } from "../lib/domain/entities";
import { AnimatedPressable } from "./AnimatedPressable";
import { ImageWithLoader } from "./ui/ImageWithLoader";
import { SectionTitle } from "./ui/SectionTitle";
import { ThemedText } from "./ui/ThemedText";

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
    const hasSynopsis = anime?.synopsis && anime.synopsis.length > 0;
    const isAiring = anime?.status?.toLowerCase().includes("emisión") || anime?.status?.toLowerCase().includes("emision") || false;

    return (
      <>
        {/* Hero Image */}
        <View
          style={[
            styles.hero,
            { height: windowHeight * 0.35, width: windowWidth },  // Increased from 0.25 for less claustrophobic feel
          ]}
        >
          <ImageWithLoader
            uri={anime?.banner || anime?.poster || ''}
            style={styles.image}
          />
          <LinearGradient
            colors={Theme.colors.overlay.detailsHero}
            locations={[0.05, 0.35, 0.7, 1]}
            style={[styles.overlay, { paddingTop: insets.top }]}>
            {/* Back Button */}
            <AnimatedPressable
              onPress={onBackPress}
              style={[styles.backButton, { marginTop: insets.top }]}
            >
              <Feather
                name="arrow-left"
                size={24}
                color={Theme.colors.text.primary}
              />
            </AnimatedPressable>

            {/* Status Badge - Top Right */}
            <View
              style={[
                styles.statusBadge,
                {
                  top: insets.top,
                  backgroundColor: Theme.colors.overlay.dark,
                }
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isAiring ? Theme.colors.primary : Theme.colors.text.primary }
                ]}
              >
                {(isAiring ? "En emisión" : "Finalizado").toUpperCase()}
              </Text>
            </View>

            {/* Title */}
            <View style={styles.titleContainer}>
              <ThemedText variant="h1" numberOfLines={2}>
                {anime?.title}
              </ThemedText>
            </View>
          </LinearGradient>
        </View>

        {/* Synopsis */}
        <View style={styles.section}>
          <SectionTitle>Sinopsis</SectionTitle>
          {hasSynopsis ? (
            <AnimatedPressable onPress={() => setIsExpanded(!isExpanded)}>
              <ThemedText
                numberOfLines={isExpanded ? undefined : 3}
                color="secondary"
              >
                {anime?.synopsis}
              </ThemedText>
              {!isExpanded && (anime?.synopsis?.length || 0) > 150 && (
                <ThemedText
                  color="accent"
                  weight={Theme.fontWeight.bold as "700"}
                  style={styles.readMore}
                >
                  Leer más
                </ThemedText>
              )}
            </AnimatedPressable>
          ) : (
            <ThemedText variant="caption" color="muted">
              Sinopsis no disponible
            </ThemedText>
          )}
        </View>

        {/* Episodes Header */}
        <View style={styles.episodesHeader}>
          <SectionTitle>Episodios ({anime?.episodes?.length || 0})</SectionTitle>
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

const styles = StyleSheet.create({
  hero: {
    overflow: "hidden",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: Theme.edge.horizontal,
    paddingBottom: Theme.spacing.xl,
  },
  backButton: {
    position: "absolute",
    top: 0,
    left: Theme.edge.horizontal,
    width: Theme.dimensions.layout.backButton,
    height: Theme.dimensions.layout.backButton,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.overlay.dark,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    position: "absolute",
    right: Theme.edge.horizontal,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.m,
  },
  statusText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.bold as "700",
    letterSpacing: 0.5,
    lineHeight: Theme.lineHeight.xs,
  },
  titleContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  section: {
    paddingHorizontal: Theme.edge.horizontal,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xl,
  },
  readMore: {
    marginTop: Theme.spacing.sm,
  },
  episodesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Theme.edge.horizontal,
    paddingTop: Theme.spacing.md,
  },
});
