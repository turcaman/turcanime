import type { AppError } from "../types";
import { isCancelled, toAppError } from "./errors";
import { logger } from "./logger";

export type ResourceStatus = "idle" | "loading" | "success" | "error";

/**
 * One state machine per loaded resource. `key` scopes every field to the
 * request it belongs to (slug, query, endpoint), so state from one key can
 * never be rendered for another one.
 */
export interface ResourceState<T> {
  status: ResourceStatus;
  /** Key of the in-flight or most recent request; null before the first one */
  key: string | null;
  /** Key that `data` belongs to; data for another key is never shown */
  dataKey: string | null;
  data: T | null;
  /** Non-null only when status is "error", and only for `key` */
  error: AppError | null;
  /** Monotonic id; only the latest request is allowed to settle */
  requestId: number;
}

export type ResourceView = "skeleton" | "content" | "error";

export function resourceInitialState<T>(): ResourceState<T> {
  return { status: "idle", key: null, dataKey: null, data: null, error: null, requestId: 0 };
}

/**
 * The only state-to-UI mapping in the app. Content wins when it belongs to
 * `key` (a failed refresh keeps the payload on screen); an error renders only
 * when it belongs to `key`; everything else is the skeleton.
 */
export function deriveView<T>(state: ResourceState<T>, key: string): ResourceView {
  if (state.data != null && state.dataKey === key) return "content";
  if (state.status === "error" && state.key === key) return "error";
  return "skeleton";
}

export function isLoadingFor<T>(state: ResourceState<T>, key: string): boolean {
  return state.status === "loading" && state.key === key;
}

export function errorFor<T>(state: ResourceState<T>, key: string): AppError | null {
  // Mirrors deriveView: content shields a failed refresh from rendering
  if (state.data != null && state.dataKey === key) return null;
  return state.status === "error" && state.key === key ? state.error : null;
}

export type LoadOutcome<T> =
  | { status: "success"; data: T }
  | { status: "cancelled" }
  | { status: "error"; error: AppError; cause: unknown };

interface RunnerOptions<T> {
  tag: string;
  get: () => ResourceState<T>;
  set: (state: ResourceState<T>) => void;
}

/**
 * Single owner of a resource's lifecycle: starts requests (aborting the
 * previous one), and is the only place in the app that can ever settle a
 * resource as "error" — and only from a real thrown failure. Cancellation and
 * supersession settle as cancelled, never as error.
 */
export class ResourceRunner<T> {
  private controller: AbortController | null = null;
  private seq = 0;

  constructor(private readonly options: RunnerOptions<T>) {}

  async load(key: string, fetcher: (signal: AbortSignal) => Promise<T>): Promise<LoadOutcome<T>> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const requestId = ++this.seq;

    const previous = this.options.get();
    this.options.set({ ...previous, status: "loading", key, error: null, requestId });
    logger.debug(this.options.tag, `Loading "${key}" (#${requestId})`);

    try {
      const data = await fetcher(controller.signal);
      if (requestId !== this.seq) {
        logger.debug(this.options.tag, `Superseded "${key}" (#${requestId}), discarding result`);
        return { status: "cancelled" };
      }
      this.options.set({ status: "success", key, dataKey: key, data, error: null, requestId });
      logger.debug(this.options.tag, `Loaded "${key}" (#${requestId})`);
      return { status: "success", data };
    } catch (cause) {
      if (requestId !== this.seq) {
        logger.debug(this.options.tag, `Superseded "${key}" (#${requestId}), discarding throw`);
        return { status: "cancelled" };
      }
      if (isCancelled(cause)) {
        const current = this.options.get();
        this.options.set({ ...current, status: current.data != null ? "success" : "idle", error: null });
        logger.debug(this.options.tag, `Cancelled "${key}" (#${requestId})`);
        return { status: "cancelled" };
      }
      const error = toAppError(cause);
      logger.warn(this.options.tag, `Load failed for "${key}" (#${requestId}): ${error.type}`, cause);
      const current = this.options.get();
      this.options.set({ ...current, status: "error", key, error, requestId });
      return { status: "error", error, cause };
    }
  }

  /** Abandons the in-flight request without touching settled state */
  cancel(): void {
    this.seq += 1;
    this.controller?.abort();
    this.controller = null;
    const current = this.options.get();
    if (current.status === "loading") {
      this.options.set({ ...current, status: current.data != null ? "success" : "idle", error: null });
    }
  }

  /**
   * Settles as error from an orchestrator-level failure. Ignored while any
   * request is in flight: that request owns the state and will settle it.
   */
  fail(key: string, error: AppError): void {
    const current = this.options.get();
    if (current.status === "loading") return;
    this.options.set({ ...current, status: "error", key, error, requestId: this.seq });
  }

  /** Drops all state, including data and any error */
  reset(): void {
    this.seq += 1;
    this.controller?.abort();
    this.controller = null;
    this.options.set(resourceInitialState<T>());
  }
}