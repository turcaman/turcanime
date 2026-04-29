/**
 * Composition root — instantiates infrastructure singletons.
 * This is the only place where concrete implementations are wired together.
 */
import { AsyncStorageRepo } from "../infrastructure/persistence/AsyncStorageRepo";
import { SessionManager } from "../infrastructure/services/SessionManager";
import { WebViewBridge } from "../infrastructure/services/WebViewBridge";

export const storage = new AsyncStorageRepo();
export const sessionManager = new SessionManager(storage);
export const webViewBridge = new WebViewBridge();
