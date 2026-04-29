/**
 * Navigation utilities — centralizes routing calls to avoid
 * scattered `router.push()` across components.
 */
import { router } from "expo-router";

export function navigateToAnime(slug: string) {
  router.push(`/anime/${slug}`);
}

export function navigateToPlayer(params: {
  slug: string;
  number: string;
  title: string;
  img: string;
}) {
  router.push({
    pathname: "/player",
    params,
  });
}

export function navigateBack() {
  router.back();
}
