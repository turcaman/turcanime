import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar as RNStatusBar } from "react-native";
import { logger } from "../../utils/logger";

export interface HistoryParams {
  title: string;
  image: string;
  url: string;
  number: string;
}

export class PlayerUIService {
  private isImmersive = false;

  async setupImmersiveMode(): Promise<void> {
    if (this.isImmersive) return;

    try {
      RNStatusBar.setHidden(true, "fade");
      await Promise.all([
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE),
        NavigationBar.setVisibilityAsync("hidden"),
      ]);
      this.isImmersive = true;
    } catch (error) {
      // Don't set isImmersive to true on failure to allow retry
      logger.warn("player", "Failed to setup immersive mode", error);
      throw error;
    }
  }

  async cleanupImmersiveMode(): Promise<void> {
    if (!this.isImmersive) return;

    try {
      RNStatusBar.setHidden(false, "fade");
      await Promise.all([
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP),
        NavigationBar.setVisibilityAsync("visible"),
      ]);
      this.isImmersive = false;
    } catch (error) {
      logger.warn("player", "Failed to cleanup immersive mode", error);
    }
  }

  async saveToHistory(
    params: HistoryParams,
    addToHistory: (params: HistoryParams & { timestamp: number }) => Promise<void>
  ): Promise<void> {
    if (params.title && params.image && params.url && params.number) {
      await addToHistory({
        ...params,
        timestamp: Date.now(),
      });
    }
  }
}
