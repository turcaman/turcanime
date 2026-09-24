import { File, Paths } from "expo-file-system";
import { startActivityAsync, ActivityAction } from "expo-intent-launcher";
import { Platform } from "react-native";
import { logger } from "../utils/logger";

const APK_FILENAME = "turcanime-update.apk";
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;
const PROGRESS_STALL_TIMEOUT_MS = 45 * 1000;

export interface DownloadProgress {
  receivedBytes: number;
  totalBytes: number | null;
}

export interface DownloadResult {
  file: File;
  cancelled: boolean;
}

// downloadFileAsync streams into the destination file without a progress callback,
// so we sample the file size at a short interval to derive progress
export async function downloadApkWithProgress(
  url: string,
  onProgress: (progress: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<DownloadResult> {
  if (Platform.OS !== "android") throw new Error("Solo Android");

  const dest = new File(Paths.cache, APK_FILENAME);
  if (dest.exists) dest.delete();

  const totalFromHeaders = await fetchTotalSize(url);
  let cancelled = false;
  let lastSize = 0;
  let stalledSince: number | null = null;
  const abortController = new AbortController();

  const poll = setInterval(() => {
    try {
      const size = dest.exists ? dest.size : 0;
      if (size === lastSize) {
        stalledSince ??= Date.now();
        if (Date.now() - stalledSince > PROGRESS_STALL_TIMEOUT_MS) {
          logger.warn("updater", "Download stalled, aborting download");
          abortController.abort();
        }
        return;
      }
      stalledSince = null;
      lastSize = size;
      onProgress({ receivedBytes: size, totalBytes: totalFromHeaders });
    } catch {
      // file may be locked mid-write; next tick retries
    }
  }, 250);

  if (signal != null) {
    if (signal.aborted) {
      clearInterval(poll);
      return { file: dest, cancelled: true };
    }
    signal.addEventListener("abort", () => {
      cancelled = true;
      abortController.abort();
    });
  }

  try {
    const download = File.downloadFileAsync(
      url,
      dest,
      { idempotent: true, headers: { "User-Agent": "Turcanime-Android" } },
    );

    const timeout = setTimeout(() => abortController.abort(), DOWNLOAD_TIMEOUT_MS);

    const file = await Promise.race([
      download,
      new Promise<never>((_, reject) =>
        abortController.signal.addEventListener("abort", () => reject(new Error("cancelled"))),
      ),
    ]);
    clearTimeout(timeout);
    if (cancelled) return { file: dest, cancelled: true };
    return { file, cancelled: false };
  } finally {
    clearInterval(poll);
  }
}

async function fetchTotalSize(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    const len = res.headers.get("content-length");
    if (res.ok && len != null) return parseInt(len, 10) || null;
  } catch {
  }
  return null;
}

export function cleanupOldApk(): void {
  try {
    const dest = new File(Paths.cache, APK_FILENAME);
    if (dest.exists) dest.delete();
  } catch (err) {
    logger.warn("updater", "Failed to clean up old APK", err);
  }
}

/**
 * Opens the system screen where the user grants "install unknown apps".
 * Used before downloading so the consent never interrupts mid-update.
 */
export async function openInstallPermissionSettings(): Promise<void> {
  if (Platform.OS !== "android") throw new Error("Solo Android");
  const result = await startActivityAsync(ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
    data: "package:com.turcanime.app",
  });
  if (result.resultCode !== -1 && result.resultCode !== 0) {
    logger.warn("updater", `Permission settings ended with resultCode ${result.resultCode}`);
  }
}

export async function installApk(file: File): Promise<void> {
  if (Platform.OS !== "android") throw new Error("Solo Android");
  // FLAG_GRANT_READ_URI_PERMISSION: the installer needs read access to our content URI
  const result = await startActivityAsync("android.intent.action.INSTALL_PACKAGE", {
    data: file.contentUri,
    type: "application/vnd.android.package-archive",
    flags: 1,
  });
  if (result.resultCode === -1) return;
  logger.warn("updater", `Installer ended with resultCode ${result.resultCode}, size=${file.size}`);
  throw new Error("La instalación se canceló. Podés reintentarlo cuando quieras.");
}
