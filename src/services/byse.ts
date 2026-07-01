import { gcm } from "@noble/ciphers/aes.js";
import { bytesToUtf8 } from "@noble/ciphers/utils.js";

interface PlaybackData {
  algorithm: string;
  iv: string;
  payload: string;
  key_parts: string[];
  version: string;
}

interface VideoSource {
  url?: string;
  file?: string;
}

interface DecryptedData {
  sources: VideoSource[];
}

interface HlsStream {
  quality: string;
  url: string;
}

export interface ByseResult {
  url: string;
  headers: Record<string, string>;
}

function selectIndexes(version: string): [number, number] | null {
  const n = parseInt(version, 10);
  if (isNaN(n) || n < 1 || n > 20) return null;
  return [n, 31 - n];
}

function selectKeyParts(data: PlaybackData): string[] {
  const idx = selectIndexes(data.version);
  if (!idx) return data.key_parts;
  const [a, b] = idx;
  if (a < 1 || b < 1 || a > data.key_parts.length || b > data.key_parts.length) {
    return data.key_parts;
  }
  const partA = data.key_parts[a - 1];
  const partB = data.key_parts[b - 1];
  const parts: string[] = [];
  if (partA != null) parts.push(partA);
  if (partB != null) parts.push(partB);
  return parts;
}

function b64url(input: string): Uint8Array {
  const binaryStr = atob(input.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

function decrypt(data: PlaybackData): string {
  const keyParts = selectKeyParts(data);
  const keyBytes = new Uint8Array(keyParts.reduce((acc, p) => acc + b64url(p).length, 0));
  let offset = 0;
  for (const part of keyParts) {
    const partBytes = b64url(part);
    keyBytes.set(partBytes, offset);
    offset += partBytes.length;
  }

  const iv = b64url(data.iv);
  const payload = b64url(data.payload);
  const tag = payload.subarray(-16);
  const ct = payload.subarray(0, -16);

  const fullCt = new Uint8Array(ct.length + tag.length);
  fullCt.set(ct, 0);
  fullCt.set(tag, ct.length);

  const cipher = gcm(keyBytes, iv);
  const decrypted = cipher.decrypt(fullCt);
  return bytesToUtf8(decrypted);
}

function parseMaster(body: string, baseUrl: string): HlsStream[] {
  const result: HlsStream[] = [];
  let info: { height: number; bw: number } | null = null;
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#EXT-X-STREAM-INF:")) {
      const h = t.match(/RESOLUTION=(\d+)x(\d+)/);
      const b = t.match(/BANDWIDTH=(\d+)/);
      info = { height: h ? parseInt(h[2]!) : 0, bw: b ? parseInt(b[1]!) : 0 };
    } else if (t && !t.startsWith("#") && info) {
      const url = t.startsWith("http") ? t : new URL(t, baseUrl).href;
      result.push({ quality: info.height ? `${info.height}p` : `bw-${info.bw}`, url });
      info = null;
    }
  }
  return result;
}

function bestStream(streams: HlsStream[]): HlsStream | null {
  if (streams.length === 0) return null;
  return streams.reduce((best, s) => {
    const bestH = parseInt(best.quality, 10) || 0;
    const curH = parseInt(s.quality, 10) || 0;
    return curH > bestH ? s : best;
  });
}

export async function extractBest(
  iframeUrl: string,
  options?: { signal?: AbortSignal; userAgent?: string },
): Promise<ByseResult | null> {
  const u = new URL(iframeUrl);
  const host = u.hostname;
  const id = u.pathname.split("/").filter(Boolean).pop();
  if (id == null) return null;

  const fetchHeaders: Record<string, string> = {
    "User-Agent": options?.userAgent ?? "",
    Accept: "application/json",
  };

  const apiUrl = `https://${host}/api/videos/${id}`;
  const raw = await fetch(apiUrl, { headers: fetchHeaders, signal: options?.signal });
  if (!raw.ok) throw new Error(`Byse API HTTP ${raw.status}`);

  const videoData: { playback?: PlaybackData } = await raw.json();
  if (videoData.playback == null) throw new Error("No playback data from Byse API");

  const decrypted = JSON.parse(decrypt(videoData.playback)) as DecryptedData;
  if (decrypted.sources.length === 0) throw new Error("No sources in decrypted Byse data");

  const ua = options?.userAgent ?? "";

  const allStreams: HlsStream[] = [];
  for (const src of decrypted.sources) {
    const su = src.url ?? src.file;
    if (su == null || su.length === 0) continue;

    const hlsBody = await fetch(su, {
      headers: { "User-Agent": ua, Referer: `https://${host}/`, Accept: "*/*" },
      signal: options?.signal,
    }).then((r) => {
      if (!r.ok) throw new Error(`Master playlist HTTP ${r.status}: ${su}`);
      return r.text();
    });

    allStreams.push(...parseMaster(hlsBody, su));
  }

  const best = bestStream(allStreams);
  if (!best) return null;

  return {
    url: best.url,
    headers: { "User-Agent": ua, Accept: "*/*", Referer: `https://${host}/` },
  };
}
