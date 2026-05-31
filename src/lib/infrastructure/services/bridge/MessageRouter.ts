import { logger } from "../../../utils/logger";
import type { BridgeMessage } from "./types";

export class MessageRouter {
  constructor(
    private activeDecryptions: Map<string, (url: string | null) => void>,
    private onStreamFound: (url: string) => void
  ) {}

  handle(message: BridgeMessage): void {
    const { type, payload } = message;

    if (type === "DECRYPTION_RESULT" && typeof payload === "object" && payload !== null) {
      const decrypted = payload as { id: string; data: string | null };
      let id = decrypted.id;
      const url = decrypted.data;
      
      // Auto-resolve logic
      if (id === "stream_auto") {
        const keys = Array.from(this.activeDecryptions.keys());
        id = keys[keys.length - 1] || id;
      }

      const resolve = this.activeDecryptions.get(id);
      if (resolve) {
        this.activeDecryptions.delete(id);
        logger.debug("MessageRouter", `DECRYPTION_RESULT for ${id}: ${url ? "OK" : "null"}`);
        resolve(url || null);
      }
    }

    if (type === "EMBED_VIDEO_URL" && typeof payload === "object" && payload !== null) {
      const { url } = payload as { url: string };
      this.onStreamFound(url);
    }
  }
}
