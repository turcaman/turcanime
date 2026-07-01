import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "react-native";
import { logger } from "../utils/logger";

export async function setupImmersiveMode(): Promise<void> {
  try {
    StatusBar.setHidden(true, "fade");
    await Promise.all([
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE),
      NavigationBar.setVisibilityAsync("hidden"),
    ]);
  } catch (error) {
    logger.warn("player", "Failed to setup immersive mode", error);
    throw error;
  }
}

export async function cleanupImmersiveMode(): Promise<void> {
  try {
    StatusBar.setHidden(false, "fade");
    await Promise.all([
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP),
      NavigationBar.setVisibilityAsync("visible"),
    ]);
  } catch (error) {
    logger.warn("player", "Failed to cleanup immersive mode", error);
  }
}
