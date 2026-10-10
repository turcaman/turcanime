import { NavigationBar } from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "react-native";
import { logger } from "../utils/logger";

export async function setupImmersiveMode(): Promise<void> {
  try {
    StatusBar.setHidden(true, "fade");
    NavigationBar.setHidden(true);
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  } catch (error) {
    logger.warn("player", "Failed to setup immersive mode", error);
    throw error;
  }
}

export async function cleanupImmersiveMode(): Promise<void> {
  try {
    StatusBar.setHidden(false, "fade");
    NavigationBar.setHidden(false);
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch (error) {
    logger.warn("player", "Failed to cleanup immersive mode", error);
  }
}

// Android keeps the last requested orientation in the system-side ActivityRecord,
// surviving process death; a boot-time reset clears a stale landscape lock
export async function resetToPortrait(): Promise<void> {
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch (error) {
    logger.warn("player", "Failed to reset orientation", error);
  }
}
