import { CacheRepo } from "../../domain/repositories/cacheRepo";
import { IMetricsTracker } from "../../domain/interfaces";
import { log } from "../../utils/logger";

export interface MetricData {
  success: number;
  failure: number;
  lastUsed: number;
}

export interface MetricsSnapshot {
  [key: string]: MetricData;
}

export class MetricsTracker implements IMetricsTracker {
  private readonly METRICS_KEY = "parsing_metrics";
  private metrics: Map<string, MetricData> = new Map();
  private cache: CacheRepo;

  constructor(cache: CacheRepo) {
    this.cache = cache;
    this.loadMetrics();
  }

  private async loadMetrics(): Promise<void> {
    try {
      const stored = await this.cache.get<MetricsSnapshot>(this.METRICS_KEY);
      if (stored) {
        this.metrics = new Map(Object.entries(stored));
      }
    } catch (e: unknown) {
      log("MetricsTracker", "Failed to load metrics", e);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      const obj = Object.fromEntries(this.metrics);
      await this.cache.set(this.METRICS_KEY, obj, 86400000); // 24 hours TTL
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
