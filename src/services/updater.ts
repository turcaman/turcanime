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

export async function downloadApkWithProgress(
  url: string,
  onProgress: (progress: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<DownloadResult> {
  if (Platform.OS !== "android") throw new Error("Solo Android");

  const dest = new File(Paths.cache, APK_FILENAME);
  if (dest.exists) dest.delete();

  // The platform task owns progress and cancellation; this controller only adds
  // the watchdogs on top of the caller's signal.
  const controller = new AbortController();
  let abortReason: "user" | "stall" | "timeout" | null = null;
  let stallTimer: ReturnType<typeof setTimeout> | undefined;

  const abort = (reason: "user" | "stall" | "timeout") => {
    if (abortReason != null) return;
    abortReason = reason;
    controller.abort();
  };
  const armStallTimer = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => abort("stall"), PROGRESS_STALL_TIMEOUT_MS);
  };

  const onExternalAbort = () => abort("user");
  if (signal?.aborted) abort("user");
  else signal?.addEventListener("abort", onExternalAbort, { once: true });

  const timeout = setTimeout(() => abort("timeout"), DOWNLOAD_TIMEOUT_MS);
  armStallTimer();

  try {
    const file = await File.downloadFileAsync(url, dest, {
      idempotent: true,
      headers: { "User-Agent": "Turcanime-Android" },
      signal: controller.signal,
      onProgress: ({ bytesWritten, totalBytes }) => {
        armStallTimer();
        onProgress({ receivedBytes: bytesWritten, totalBytes: totalBytes > 0 ? totalBytes : null });
      },
    });
    return { file, cancelled: false };
  } catch (error) {
    if (abortReason === "user") return { file: dest, cancelled: true };
    if (abortReason != null) throw new Error(abortReason);
    throw error;
  } finally {
    clearTimeout(timeout);
    clearTimeout(stallTimer);
    signal?.removeEventListener("abort", onExternalAbort);
  }
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
