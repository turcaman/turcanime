import Constants from "expo-constants";
import NetInfo from "@react-native-community/netinfo";
import { create } from "zustand";
import { TIMEOUTS } from "../config/cache";
import { storage } from "../utils/storage";
import { logger } from "../utils/logger";
import {
  downloadApkWithProgress,
  installApk,
  cleanupOldApk,
  openInstallPermissionSettings,
  type DownloadProgress,
} from "../services/updater";

export const UPDATE_CHECK_KEY = "update_check_enabled";
const INSTALL_PERMISSION_KEY = "install_permission_granted";
const GITHUB_RELEASES_URL =
  "https://api.github.com/repos/turcaman/turcanime/releases/latest";
const CHECK_COOLDOWN_MS = 60 * 60 * 1000;

function parseVersion(v: string): number[] {
  return v.split(".").map((n) => parseInt(n, 10) || 0);
}

function isNewer(latest: string, current: string): boolean {
  const l = parseVersion(latest);
  const c = parseVersion(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const a = l[i] ?? 0;
    const b = c[i] ?? 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

export type UpdatePhase =
  | "idle"
  | "confirm"
  | "permission"
  | "downloading"
  | "installing"
  | "error"
  | "ready";

interface UpdateState {
  updateCheckEnabled: boolean;
  updateAvailable: string | null;
  checkingForUpdates: boolean;
  lastCheckError: string | null;
  currentVersion: string | null;
  phase: UpdatePhase;
  progress: DownloadProgress;
  errorMessage: string | null;
  apkUrl: string | null;
  installPermissionGranted: boolean;
  /** True only while the user is away granting the install permission */
  resumeAfterPermission: boolean;
  initialize: (enabled: boolean) => void;
  setUpdateCheckEnabled: (enabled: boolean) => Promise<void>;
  checkForUpdates: (force?: boolean) => Promise<boolean>;
  startUpdate: () => void;
  closeUpdate: () => void;
  confirmUpdate: () => Promise<void>;
  beginDownload: () => Promise<void>;
  cancelDownload: () => void;
}

let downloadAbort: AbortController | null = null;
let checkPromise: Promise<boolean> | null = null;
let lastSuccessAt = 0;

type StoreSet = (partial: Partial<UpdateState>) => void;
type StoreGet = () => UpdateState;

async function runCheck(
  get: StoreGet,
  set: StoreSet,
  force: boolean,
): Promise<boolean> {
  const current = Constants.expoConfig?.version;
  if (!current) {
    set({ lastCheckError: "Error al obtener versión" });
    return false;
  }
  if (!force && get().updateCheckEnabled === false) return true;
  if (!force && Date.now() - lastSuccessAt < CHECK_COOLDOWN_MS) return true;
  try {
    const net = await NetInfo.fetch();
    if (net.isConnected === false || net.isInternetReachable === false) {
      if (!force) return true;
      set({ checkingForUpdates: false, lastCheckError: "Sin conexión" });
      return false;
    }
  } catch {
  }
  set({ checkingForUpdates: true, lastCheckError: null });
  try {
    const res = await Promise.race([
      fetch(`${GITHUB_RELEASES_URL}?_=${Date.now()}`, {
        headers: { "User-Agent": "Turcanime-Android" },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Update check timeout")), TIMEOUTS.UPDATE_CHECK),
      ),
    ]);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = (await res.json()) as {
      tag_name?: string;
      assets?: { name: string; browser_download_url: string; size?: number }[];
    };
    const latest = (data.tag_name ?? "").replace(/^v/, "").trim();
    if (!latest) throw new Error("No tag");
    const isPrerelease = latest.includes("-");

    const apkAsset = data.assets?.find(
      (a) =>
        a.name.toLowerCase().startsWith("turcanime-") &&
        a.name.toLowerCase().endsWith(".apk") &&
        (a.size == null || a.size > 5 * 1024 * 1024),
    );

    set({
      updateAvailable: !isPrerelease && isNewer(latest, current) ? latest : null,
      apkUrl: apkAsset?.browser_download_url ?? null,
      currentVersion: current,
      checkingForUpdates: false,
      lastCheckError: null,
    });
    lastSuccessAt = Date.now();
    return true;
  } catch (err) {
    set({ checkingForUpdates: false, lastCheckError: "Error al buscar actualizaciones" });
    logger.error("updateStore", "Failed to check for updates", err);
    return false;
  }
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateCheckEnabled: true,
  updateAvailable: null,
  checkingForUpdates: false,
  lastCheckError: null,
  currentVersion: null,
  phase: "idle",
  progress: { receivedBytes: 0, totalBytes: null },
  errorMessage: null,
  apkUrl: null,
  installPermissionGranted: false,
  resumeAfterPermission: false,

  initialize: (enabled) => {
    const currentVersion = Constants.expoConfig?.version ?? null;
    set({ updateCheckEnabled: enabled, currentVersion });
    cleanupOldApk();
    void storage
      .get<boolean>(INSTALL_PERMISSION_KEY)
      .then((granted) => set({ installPermissionGranted: granted === true }))
      .catch(() => {});
  },

  setUpdateCheckEnabled: async (enabled) => {
    const prev = get().updateCheckEnabled;
    set({ updateCheckEnabled: enabled });
    try {
      await storage.set(UPDATE_CHECK_KEY, enabled);
    } catch (err) {
      set({ updateCheckEnabled: prev });
      logger.error("updateStore", "Failed to persist update check toggle", err);
    }
  },

  checkForUpdates: async (force = false) => {
    if (checkPromise) return checkPromise;
    checkPromise = runCheck(get, set, force);
    try {
      return await checkPromise;
    } finally {
      checkPromise = null;
    }
  },
  startUpdate: () => {
    const { updateAvailable, apkUrl } = get();
    if (updateAvailable == null) return;
    if (apkUrl == null) {
      set({ phase: "error", errorMessage: "No hay archivo de instalación disponible para esta versión." });
      return;
    }
    set({ phase: "confirm", errorMessage: null });
  },

  closeUpdate: () => {
    if (get().phase === "downloading") {
      downloadAbort?.abort();
      downloadAbort = null;
    }
    set({ phase: "idle", errorMessage: null, resumeAfterPermission: false });
  },

  confirmUpdate: async () => {
    if (!get().installPermissionGranted) {
      set({ phase: "permission" });
      return;
    }
    await get().beginDownload();
  },

  beginDownload: async () => {
    // Re-entrant call (double tap, or AppState resume racing the settings flow)
    if (get().phase === "downloading") return;

    const { apkUrl } = get();
    if (apkUrl == null) return;

    downloadAbort = new AbortController();
    set({
      phase: "downloading",
      progress: { receivedBytes: 0, totalBytes: null },
      errorMessage: null,
    });

    try {
      const { file, cancelled } = await downloadApkWithProgress(
        apkUrl,
        (progress) => set({ progress }),
        downloadAbort.signal,
      );
      if (cancelled) {
        set({ phase: "idle" });
        return;
      }
      set({ phase: "installing" });
      try {
        await installApk(file);
      } catch (installErr) {
        // Permission may never have been granted: force the permission
        // screen again next time instead of failing silently forever
        set({ installPermissionGranted: false });
        void storage.set(INSTALL_PERMISSION_KEY, false);
        throw installErr;
      }
      set({ installPermissionGranted: true });
      void storage.set(INSTALL_PERMISSION_KEY, true);
      set({ phase: "ready" });
    } catch (err) {
      if (err instanceof Error && err.message === "cancelled") {
        set({ phase: "idle" });
        return;
      }
      logger.error("updateStore", "Download/install failed", err);
      const message =
        err instanceof Error && err.message === "stalled"
          ? "La descarga se detuvo por conexión lenta. Reintentá cuando tengas mejor señal."
          : err instanceof Error && err.message === "timeout"
            ? "La descarga tardó demasiado. Reintentá con mejor conexión."
            : err instanceof Error
              ? err.message
              : "No se pudo completar la actualización.";
      set({ phase: "error", errorMessage: message });
    } finally {
      downloadAbort = null;
    }
  },

  cancelDownload: () => {
    downloadAbort?.abort();
    downloadAbort = null;
    set({ phase: "idle" });
  },
}));

export async function grantInstallPermissionAndDownload(): Promise<void> {
  const store = useUpdateStore.getState();
  try {
    // Arm the AppState resume only now: merely being in the "permission" phase
    // (e.g. an unrelated background/foreground cycle) must not auto-download
    // without the permission granted
    useUpdateStore.setState({ resumeAfterPermission: true });
    await openInstallPermissionSettings();
    // Memory-only: persisted only after installApk succeeds, so denying
    // in settings retries the permission screen next time
    useUpdateStore.setState({ installPermissionGranted: true });
    await store.beginDownload();
  } catch (err) {
    logger.error("updateStore", "Permission flow failed", err);
    useUpdateStore.setState({
      phase: "error",
      errorMessage: "No se pudo abrir los ajustes de instalación.",
    });
  }
}
