/**
 * Composition root — instantiates infrastructure singletons.
 * This is the only place where concrete implementations are wired together.
 */
import { AsyncStorageRepo } from "../infrastructure/persistence/AsyncStorageRepo";
import { SessionManager } from "../infrastructure/services/SessionManager";
import { WebViewBridge } from "../infrastructure/services/WebViewBridge";
import type { IContentProvider } from "../domain/interfaces";
import { logger } from "../utils/logger";

export const storage = new AsyncStorageRepo();
export const sessionManager = new SessionManager(storage);
export const webViewBridge = new WebViewBridge();

export async function refreshSession(getProvider: () => IContentProvider): Promise<void> {
  logger.info("infrastructure", "Refreshing session...");

  await sessionManager.invalidateCookies();

  const { sessionWashUrl } = getProvider() as { sessionWashUrl?: string };
  webViewBridge.navigateTo(sessionWashUrl ?? "about:blank");

  try {
    await sessionManager.waitForCookies();
    logger.info("infrastructure", "Session refreshed successfully");
  } catch (e) {
    logger.error("infrastructure", "Failed to wait for cookies after refresh", e);
  }
}
