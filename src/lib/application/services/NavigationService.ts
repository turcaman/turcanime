import { HistoryItem } from "../../domain/entities";
import { HistoryParams } from "./PlayerUIService";

export class NavigationService {
  async saveToHistory(
    params: HistoryParams,
    addToHistory: (item: HistoryItem) => Promise<void>
  ): Promise<void> {
    if (params.title && params.image && params.url && params.number) {
      await addToHistory({
        ...params,
        timestamp: Date.now(),
      });
    }
  }

  setTabBarVisible(
    visible: boolean,
    setTabBarVisible: (visible: boolean) => void
  ): void {
    setTabBarVisible(visible);
  }

  resetTabBar(
    setTabBarVisible: (visible: boolean) => void
  ): void {
    this.setTabBarVisible(true, setTabBarVisible);
  }
}
