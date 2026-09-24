import { router } from "expo-router";

const Routes = {
  ANIME: (slug: string) => `/anime/${slug}` as const,
  PLAYER: "/player",
};

// Covers a deliberate human double-tap (~300-500ms) plus the slide transition
const NAVIGATION_LOCK_MS = 600;
// Same-route pushes are rejected for longer: pressing the same card again
// right after the lock expires must not stack a second details screen
const DUPLICATE_ROUTE_MS = 1000;
let navigationLockedUntil = 0;
let lastPushedKey = "";
let lastPushedAt = 0;

function pushKey(path: string | object): string {
  return typeof path === "string" ? path : JSON.stringify(path);
}

function debouncedPush(path: string | object) {
  const now = Date.now();
  if (now < navigationLockedUntil) return;
  const key = pushKey(path);
  if (key === lastPushedKey && now - lastPushedAt < DUPLICATE_ROUTE_MS) return;
  navigationLockedUntil = now + NAVIGATION_LOCK_MS;
  lastPushedKey = key;
  lastPushedAt = now;
  router.push(path as never);
}

export function navigateToAnime(slug: string) {
  debouncedPush(Routes.ANIME(slug));
}

export function navigateToPlayer(params: {
  slug: string;
  number: string;
  title: string;
  image: string;
}) {
  debouncedPush({ pathname: Routes.PLAYER, params });
}

export function navigateBack() {
  router.back();
}
