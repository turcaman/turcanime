export type MessageType = "STREAM_URL" | "ERROR" | "LOG" | "DECRYPTION_RESULT" | "EMBED_VIDEO_URL";

export interface BridgeMessage {
  type: MessageType;
  payload: unknown;
}

export interface IMessageRouter {
  handle(message: BridgeMessage): void;
}
