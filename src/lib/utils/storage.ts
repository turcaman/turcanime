import { getDeps } from "../di";
import { logger } from "../utils/logger";

export async function persistState<T>(
  key: string,
  updated: T,
  rollback: () => void,
  loggerContext: string,
  errorMsg: string
): Promise<void> {
  try {
    await getDeps().storage.set(key, updated);
  } catch (error) {
    rollback();
    logger.error(loggerContext, errorMsg, error);
  }
}
