/**
 * Navigation utilities — centralizes routing calls to avoid
 * scattered `router.push()` across components.
 * Includes a navigation lock to prevent double-tap issues (opening 2 nested screens).
 */
import { router } from "expo-router";
import { Routes } from "./routes";

const NAVIGATION_LOCK_MS = 300;
let navigationLockedUntil = 0;

function debouncedPush(path: string | object) {
  const now = Date.now();
  if (now < navigationLockedUntil) {
    return;
  }

  navigationLockedUntil = now + NAVIGATION_LOCK_MS;
  /*
   * Use `navigate` instead of `push` so React Navigation deduplicates
   * screens with the same route name. This prevents double-tap from
   * creating nested detail screens.
   *
   * When navigating to a different slug, `navigate` finds the existing
   * `[slug]` screen and updates its params — no extra stack entry.
   */
  router.navigate(path as never);
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
  debouncedPush({
    pathname: Routes.PLAYER,
    params,
  });
}

export function navigateBack() {
  router.back();
}
