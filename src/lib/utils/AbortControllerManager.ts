/**
 * Reusable AbortController manager for preventing stale requests
 * and race conditions in async operations.
 */

export class AbortControllerManager {
  private controllers: Map<string, AbortController> = new Map();

  /**
   * Get a new AbortController for the given key, aborting any previous one.
   * @param key - Unique identifier for the operation type
   * @returns New AbortController instance
   */
  getController(key: string): AbortController {
    // Abort existing controller if it exists
    const existing = this.controllers.get(key);
    if (existing) {
      existing.abort();
    }

    // Create and store new controller
    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller;
  }

  /**
   * Abort the controller for the given key if it exists.
   * @param key - Unique identifier for the operation type
   */
  abort(key: string): void {
    const controller = this.controllers.get(key);
    if (controller) {
      controller.abort();
      this.controllers.delete(key);
    }
  }

  /**
   * Check if a controller for the given key is aborted.
   * @param key - Unique identifier for the operation type
   * @returns True if aborted, false otherwise
   */
  isAborted(key: string): boolean {
    const controller = this.controllers.get(key);
    return controller?.signal.aborted ?? false;
  }

  /**
   * Clean up all controllers.
   */
  abortAll(): void {
    for (const controller of this.controllers.values()) {
      controller.abort();
    }
    this.controllers.clear();
  }

  /**
   * Remove a controller from the manager.
   * @param key - Unique identifier for the operation type
   */
  remove(key: string): void {
    this.controllers.delete(key);
  }
}

// Singleton instance for global use
export const abortManager = new AbortControllerManager();
