import { TIMEOUTS } from "../../../config/timeouts";
import { logger } from "../../../utils/logger";

type InjectFn = (code: string) => void;

export class StreamResolver {
  constructor(private injectFn: InjectFn) {}

  async pollForExtraction(
    requestId: string,
    isActive: (id: string) => boolean,
    script: string,
    context: string
  ): Promise<void> {
    let attempts = 0;
    const maxAttempts = TIMEOUTS.IFRAME_POLL_MAX_ATTEMPTS;
    const interval = TIMEOUTS.IFRAME_POLL_INTERVAL;

    const poll = () => {
      if (!isActive(requestId)) return;

      attempts++;
      if (attempts > maxAttempts) {
        logger.debug("StreamResolver", `${context} extraction polling exhausted`);
        return;
      }

      this.injectFn(script);

      if (isActive(requestId)) {
        setTimeout(poll, interval);
      }
    };

    setTimeout(poll, interval);
  }
}
