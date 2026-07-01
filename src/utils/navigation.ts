import { router } from "expo-router";

const Routes = {
  ANIME: (slug: string) => `/anime/${slug}` as const,
  PLAYER: "/player",
};

const NAVIGATION_LOCK_MS = 300;
let navigationLockedUntil = 0;

function debouncedPush(path: string | object) {
  const now = Date.now();
  if (now < navigationLockedUntil) return;
  navigationLockedUntil = now + NAVIGATION_LOCK_MS;
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
