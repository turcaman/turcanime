import { initializeDeps } from "../../di";
import { useUserStore } from "../../store/userStore";
import { logger } from "../../utils/logger";

export class AppInitializationService {
  private static instance: AppInitializationService;
  private isInitialized = false;
  private initializingPromise: Promise<void> | null = null;

  static getInstance(): AppInitializationService {
    if (!AppInitializationService.instance) {
      AppInitializationService.instance = new AppInitializationService();
    }
    return AppInitializationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializingPromise) return this.initializingPromise;

    this.initializingPromise = this.doInitialize();

    try {
      await this.initializingPromise;
    } finally {
      this.initializingPromise = null;
    }
  }

  private async doInitialize(): Promise<void> {
    try {
      // Initialize DI and providers
      const { ready: diReady } = initializeDeps();
      await diReady;

      // Initialize user store
      await useUserStore.getState().initialize();

      this.isInitialized = true;
    } catch (error) {
      logger.error('AppInitializationService', 'Initialization failed', error);
      // Don't set isInitialized to true on error to allow retry
      throw error;
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  reset(): void {
    this.isInitialized = false;
  }
}
