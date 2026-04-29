import { CacheRepo } from "../../domain/repositories/cacheRepo";
import { log } from "../../utils/logger";

export interface MetricData {
  success: number;
  failure: number;
  lastUsed: number;
}

export interface MetricsSnapshot {
  [key: string]: MetricData;
}

export class MetricsTracker {
  private readonly METRICS_KEY = "parsing_metrics";
  private metrics: Map<string, MetricData> = new Map();
  private cache: CacheRepo | null = null;

  constructor() {
    this.loadMetrics();
  }

  private getCache(): CacheRepo | null {
    if (!this.cache) {
      try {
        this.cache = CacheRepo.getInstance();
      } catch {
        return null;
      }
    }
    return this.cache;
  }

  private async loadMetrics(): Promise<void> {
    try {
      const cache = this.getCache();
      if (!cache) return;

      const stored = await cache.get<MetricsSnapshot>(this.METRICS_KEY);
      if (stored) {
        this.metrics = new Map(Object.entries(stored));
      }
    } catch (e: unknown) {
      log("MetricsTracker", "Failed to load metrics", e);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      const cache = this.getCache();
      if (!cache) return;

      const obj = Object.fromEntries(this.metrics);
      await cache.set(this.METRICS_KEY, obj, 86400000); // 24 hours TTL
    } catch (e: unknown) {
      log("MetricsTracker", "Failed to save metrics", e);
    }
  }

  record(strategy: string, success: boolean): void {
    const current = this.metrics.get(strategy) || {
      success: 0,
      failure: 0,
      lastUsed: 0,
    };

    if (success) {
      current.success++;
    } else {
      current.failure++;
    }
    current.lastUsed = Date.now();

    this.metrics.set(strategy, current);
    this.saveMetrics();
  }

}
