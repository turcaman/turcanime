import { useEffect, useRef } from "react";
import { useDetailsStore } from "../stores/detailsStore";
import { deriveView, errorFor, isLoadingFor, type ResourceView } from "../utils/resource";

export function useAnimeData(slug: string) {
  const resource = useDetailsStore((s) => s.resource);
  const fetchDetails = useDetailsStore((s) => s.fetchDetails);
  // One auto-load per slug per screen mount; failures retry only on demand
  const attemptedSlugRef = useRef<string | null>(null);

  const anime = resource.data != null && resource.dataKey === slug ? resource.data : null;
  const view: ResourceView = deriveView(resource, slug);

  useEffect(() => {
    if (attemptedSlugRef.current === slug) return;
    attemptedSlugRef.current = slug;
    const current = useDetailsStore.getState().resource;
    if (isLoadingFor(current, slug)) return;
    if (current.data != null && current.dataKey === slug) return;
    void fetchDetails(slug);
  }, [slug, fetchDetails]);

  return {
    anime,
    view,
    isLoading: isLoadingFor(resource, slug),
    error: errorFor(resource, slug),
    hasLoaded: anime != null,
    refresh: () => void fetchDetails(slug, true),
  };
}
