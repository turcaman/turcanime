import Constants from "expo-constants";
import { create } from "zustand";
import { storage } from "../utils/storage";
import { logger } from "../utils/logger";

const UPDATE_CHECK_KEY = "update_check_enabled";
const GITHUB_RELEASES_URL =
  "https://api.github.com/repos/turcaman/turcanime/releases/latest";

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

interface UpdateState {
  updateCheckEnabled: boolean;
  updateAvailable: string | null;
  checkingForUpdates: boolean;
  lastCheckError: string | null;
  currentVersion: string | null;
  initialize: (enabled: boolean) => void;
  setUpdateCheckEnabled: (enabled: boolean) => Promise<void>;
  checkForUpdates: () => Promise<void>;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateCheckEnabled: true,
  updateAvailable: null,
  checkingForUpdates: false,
  lastCheckError: null,
  currentVersion: null,

  initialize: (enabled) => {
    const currentVersion = Constants.expoConfig?.version ?? null;
    set({ updateCheckEnabled: enabled, currentVersion });
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

  checkForUpdates: async () => {
    const current = Constants.expoConfig?.version;
    if (!current) {
      set({ lastCheckError: "Error al obtener versión" });
      return;
    }
    set({ checkingForUpdates: true, lastCheckError: null });
    try {
      const res = await fetch(
        `${GITHUB_RELEASES_URL}?_=${Date.now()}`,
        { headers: { "User-Agent": "Turcanime-Android" } },
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = (await res.json()) as { tag_name?: string };
      const latest = (data.tag_name ?? "").replace(/^v/, "").trim();
      if (!latest) throw new Error("No tag");

      const available = isNewer(latest, current) ? latest : null;
      set({
        updateAvailable: available,
        currentVersion: current,
        checkingForUpdates: false,
        lastCheckError: null,
      });
    } catch (err) {
      set({
        checkingForUpdates: false,
        lastCheckError: "Error al buscar actualizaciones",
      });
      logger.error("updateStore", "Failed to check for updates", err);
    }
  },
}));
