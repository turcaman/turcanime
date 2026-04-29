import { ISession, WebViewMessageData } from "../../domain/interfaces";
import { logger } from "../../utils/logger";

type Resolver = (url: string | null) => void;

function handleDecryptionResult(
  data: WebViewMessageData,
  activeDecryptions: Map<string, Resolver>,
  currentRequestId: string | null
): void {
  if (data.type !== "DECRYPTION_RESULT") return;

  let { id, data: url, error } = data;

  if (id === "stream_auto" && currentRequestId) {
    id = currentRequestId;
  }

  const resolve = activeDecryptions.get(id);
  if (resolve) {
    activeDecryptions.delete(id);
    logger.debug("handleDecryptionResult", `DECRYPTION_RESULT for ${id}: ${url ? "OK" : "null"} ${error || ""}`);
    resolve(url || null);
  }
}

function handleEmbedVideoUrl(
  data: WebViewMessageData,
  activeDecryptions: Map<string, Resolver>,
  currentRequestId: string | null
): void {
  if (data.type !== "EMBED_VIDEO_URL") return;

  const requestId = currentRequestId;
  if (requestId) {
    const autoResolve = activeDecryptions.get(requestId);
    logger.debug("handleEmbedVideoUrl", `EMBED_VIDEO_URL intercepted: ${data.url}, resolving request: ${requestId}`);
    if (autoResolve) {
      activeDecryptions.delete(requestId);
      autoResolve(data.url);
    }
  }
}

function handleLegacyString(parsed: string): { type: string; data: WebViewMessageData } {
  const data: WebViewMessageData = { type: "RAW", data: parsed };
  return { type: "RAW", data };
}

function handleLegacyObject(obj: Record<string, unknown>): { type: string; data: WebViewMessageData } | null {
  if ("id" in obj && "data" in obj) {
    const data: WebViewMessageData = {
      type: "DECRYPTION_RESULT",
      id: String(obj.id),
      data: obj.data as string | null,
      error: "error" in obj ? String(obj.error) : undefined,
    };
    return { type: "DECRYPTION_RESULT", data };
  }

  if ("cookies" in obj && "userAgent" in obj) {
    const data: WebViewMessageData = {
      type: "SESSION",
      session: obj as unknown as ISession,
    };
    return { type: "SESSION", data };
  }

  return null;
}

export function handleDecryptionMessage(
  data: WebViewMessageData,
  activeDecryptions: Map<string, Resolver>,
  currentRequestId: string | null
): void {
  handleDecryptionResult(data, activeDecryptions, currentRequestId);
}

export function handleEmbedMessage(
  data: WebViewMessageData,
  activeDecryptions: Map<string, Resolver>,
  currentRequestId: string | null
): void {
  handleEmbedVideoUrl(data, activeDecryptions, currentRequestId);
}

export function handleLegacyMessage(parsed: unknown): { type: string; data: WebViewMessageData } | null {
  if (typeof parsed === "string") {
    return handleLegacyString(parsed);
  }

  if (typeof parsed === "object" && parsed !== null) {
    return handleLegacyObject(parsed as Record<string, unknown>);
  }

  return null;
}
