# AGENTS.md

## Quick Commands

```bash
npx tsc --noEmit              # typecheck (no emit)
npx eslint . --max-warnings=0  # lint strict
npx tsc --noEmit && npx eslint . --max-warnings=0  # both
```

No `test` script defined. No test framework installed.

## Project

Expo 55 + React Native 0.83 app. **Android-only** (no iOS, web, or other platforms).
File-based routing via `expo-router`.

- **Entry:** `app/_layout.tsx` → `app/(tabs)/` (Home, Search, Settings)
- **State:** Zustand stores in `src/stores/`. Use **individual selectors** (`useStore(s => s.field)`) instead of full store subscription to avoid unnecessary re-renders.
- **Source:** Anime content API via `src/services/source.ts`
- **Stream:** Direct HTTP fetch via `fetchWithSession` (no WebView).
  - Bridge page fetched → iframe URL extracted from HTML → `extractBest()` decrypts Byse via `@noble/ciphers`.
  - Hidden WebView (`WebViewWorker`) only used for session init + refresh (Cloudflare validation, cookie acquisition).
- **Related animes:** Prequel/sequel/related extracted from RSC payload by `HtmlParser.extractRelations()`. Displayed as horizontal FlashList in `AnimeDetailsHeader`.

## Path Alias

`@/*` maps to `./src/*`. Use it for all imports.

## Conventions

- Dark theme only. `StatusBar style="light"`.
- Components: `src/components/`, hooks: `src/hooks/`, stores: `src/stores/`.
- Services: `src/services/`, utils: `src/utils/`, config: `src/config/`.
- Types: `src/types.ts` (single file).
- Skeleton components: `src/components/skeletons/` — one per screen with async content (HomeSkeleton, DetailSkeleton, SearchSkeleton).
- Base skeleton UI: `src/components/ui/Skeleton.tsx` — Reanimated pulse opacity animation (0.3↔0.7, 800ms).
- **Comments:** Only for logic the code itself doesn't explain.
  - No section headers (no banner comments, no `/** Section */` JSDocs).
  - No "what" comments (`// Fetch data`, `// Try cache first`).
  - No JSDocs on self-explanatory functions/constants/variables.
  - Allowed: JSDoc on complex public APIs explaining non-obvious behavior.
  - Allowed: `// why` for workarounds, race conditions, platform bugs.

## Loading States & Transitions

All screens with async data follow this pattern:

```
Initial:     Skeleton (opacity 1)
Transition:  Crossfade 250ms (skeleton 1→0, content 0→1)
Final:       Real content (opacity 1)
Refresh:     Skeleton appears (opacity reset to 1) → crossfade again
Error:       ErrorState (no skeleton, no transition)
```

**Implementation** (see `app/(tabs)/index.tsx` and `app/anime/[slug].tsx`):
- Use `useSharedValue` for `skeletonOpacity` and `contentOpacity`.
- Use `useState` for `keepSkeleton` to keep skeleton in DOM during transition.
- Use `useRef` (`wasReady`/`wasShowingSkeleton`) to guard against double-fires.
- Skeleton overlays content via `StyleSheet.absoluteFill`.
- When content unloads (refresh/navigation), reset: `skeletonOpacity = 1`, `contentOpacity = 0`, `keepSkeleton = true`.
- Duration: 250ms (`CROSSFADE_DURATION` constant).

**Skeleton fidelity**: Skeletons must be faithful to the real layout. No invented elements (e.g., DetailSkeleton had a floating poster overlay that doesn't exist in the real UI). Read the real component first, then mirror its structure exactly. Use `useWindowDimensions` for dynamic sizing matching the real component's values.

**Search** uses a simpler fade-in (150ms) via `Animated.Value` — sufficient since search results transition from loading to content without a skeleton overlay.

**Episode modal** uses `FadeIn` entering animation (staggered 50ms delay per item, 200ms duration) on server list items.
