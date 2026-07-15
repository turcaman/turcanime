# AGENTS.md

## Quick Commands

```bash
npx tsc --noEmit              # typecheck (no emit)
npm run lint                   # ESLint 9 flat config (eslint.config.js)
npx tsc --noEmit && npm run lint  # both
```

No test framework — no `test` script.

## Project

Expo 55 + React Native 0.83 app. **Android-only** (no iOS/web).
File-based routing via `expo-router`.

- **Version:** `package.json` + `app.json` (`expo.version` + `expo.android.versionCode`). Current: 1.10.5 (versionCode 1105).
- **Entry:** `app/_layout.tsx` → `app/(tabs)/` (Home, Search, Settings).
- **Routes:** `app/(tabs)/` (tab screens), `app/anime/[slug].tsx` (detail), `app/player.tsx` (player).
- **State:** Zustand stores in `src/stores/`. Use **individual selectors** (`useStore(s => s.field)`) — never full store subscription.
- **Imports:** `@/*` maps to `./src/*`.
- **Styling:** NativeWind v5 + Tailwind CSS v4. `global.css` entry: `@import "tailwindcss"; @import "nativewind/theme";` (no `@layer` wrappers).
- **TypeScript:** strict mode, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`.

## Architecture

### Source & Streaming

- **Source:** configuración en `src/config/source.ts` (scraper de anime). TMDB images for posters.
- **Stream:** Direct HTTP fetch via `fetchWithSession` (no WebView for streaming).
  - Bridge page fetched → iframe URL extracted → `extractBest()` decrypts Byse payload via `@noble/ciphers` AES-GCM.
  - Decryption: `gcm()` from `@noble/ciphers/aes.js`, key assembled from `key_parts` using version-based index selection.
  - `parseMaster()` resolves HLS master playlist → `bestStream()` selects highest resolution.
- **Hidden WebView (`WebViewWorker`):** only for session init + refresh (Cloudflare validation, cookie acquisition).
  - `GLOBAL_BOOTSTRAP` JS injected: polls `document.cookie` up to 50× every 100ms, reports via `postMessage`.
- **Video:** `expo-video` (`VideoView` + `useVideoPlayer`). Not react-native-video or WebView.

### Session Management (`src/services/session.ts`)

- `SessionManager` class with deduplication via `refreshPromise`.
- `acquireFreshSession()`: returns existing `refreshPromise` if one is active, preventing concurrent refreshes.
- `executeRefresh()` (private): `invalidateCookies()` → navigate WebView to wash URL → `waitForCookies()`.
- `waitForCookies()`: polls every 2s for up to 60s (30 attempts), checking that cookies have actually arrived.
- `invalidateCookies()`: sets empty cookies, creates new `sessionReadyPromise` for next refresh cycle.
- `fetchWithSession` in `src/services/source.ts`:
  - Waits for cookies via `sessionManager.waitForCookies()`.
  - Attaches session cookies + browser-like headers to every request.
  - Captures `Set-Cookie` headers and merges into session via `mergeCookies()`.
  - Smart retry: 1 retry with 1s delay for non-401/403 HTTP errors and network errors.
  - Auth errors (401/403): throws `error.type = "AUTH_ERROR"` — does NOT call `invalidateCookies()` (removed to avoid race with session refresh).

### Cache (`src/utils/cache.ts` + `src/config/cache.ts`)

- `withCache()` utility: returns cached value if available and not expired.
- **Stale threshold:** 30% of TTL — when remaining TTL falls below 30%, the cached entry is considered stale and a fresh fetch is performed (the stale entry is discarded, not returned).
- **Max entry size:** 1MB (`LIMITS.CACHE_MAX_ENTRY_SIZE`). Larger entries are logged and skipped.
- **Prefix-based TTLs:**
  - `ch_home` → 6h, `search` → 30m, `suggestions` → 5m, `anime_` → 12h, `servers_` → 10m, `stream_` → 5m.
- **Cache invalidation:** `settingsStore.cacheInvalidationTimestamp` triggers re-fetch. On session refresh, all cache keys matching known prefixes are deleted.

### Parser (`src/services/parsers.ts`)

- `HtmlParser` class with multiple extraction strategies (fallback chain documented per method).
- **Episode extraction:** RSC payload → script JSON → HTML regex fallback.
- **Detail extraction:** `rscData.poster/synopsis/relations` → `jsonLd` → `dom` → `meta` tags.
- RSC (React Server Components) payload parsing via `self.__next_f.push` script detection.
- `ParserUtils.extractJson()` handles balanced bracket JSON extraction.

## Auth Error Auto-Retry Pattern

This pattern is used across all data stores to handle `AUTH_ERROR` (session expired):

```typescript
// homeStore.ts — recursive attempt() with exponential backoff
const attempt = async (retryCount: number, isRetry: boolean): Promise<void> => {
  const result = await withCache(CACHE_PREFIXES.HOME, (sig) => source.getHomeData({ signal: sig }), { ... });
  const isAuthError = (result.error as { type?: string })?.type === "AUTH_ERROR";

  if (isAuthError && retryCount < 2) {
    logger.info("homeStore", `Auth error, refreshing session and retrying (attempt ${retryCount + 1}/3)...`);
    try { await refreshSession(); } catch { logger.warn(...); }
    await new Promise((resolve) => setTimeout(resolve, backoff)); // 1s → 2s
    return attempt(retryCount + 1, true);
  }
  // handle result...
};
```

- **homeStore:** recursive `attempt()` with up to 2 retries, backoff 1s→2s, `force: true` on retry.
- **detailsStore:** single retry with `force: true`.
- **playerStore (fetchServers):** single retry with `try/catch` around retry.
- **playerStore (resolveStream):** `doResolve()` closure called twice (original + after refresh).
- **useEpisodeNavigation:** `attempt()` closure with `_retried` flag.

Key reference: `git log` commits `6b6159c` (refactor: deduplicate session refresh), `f40c3c8` (add AUTH_ERROR auto-retry), `a5e242e` (auto-retry on auth failure), `02a71bd` (home stale data resilience).

## Session Refresh Flow (`app/_layout.tsx`)

1. **Triggers:** Connection type change, internet becomes reachable, app foreground after 5min idle, manual "Actualizar datos" in Settings.
2. `useHomeStore.getState().prepareRefresh()` — clears home data, shows skeleton.
3. `refreshSession()` via `sessionManager.acquireFreshSession()` (deduplicated).
4. If session refresh succeeds → clear all cache keys → `fetchHome(true)` → `invalidateCache()`.
5. If session refresh fails → `fetchHome(false)` (uses stale cache).
6. **Safety net:** 12s timer — if home data is still empty and not loading, retries `fetchHome(true)`.

## Loading States & Transitions

All async screens follow:
```
Initial:     Skeleton (opacity 1)
Transition:  Crossfade 250ms (skeleton 1→0, content 0→1)
Final:       Real content (opacity 1)
Refresh:     Skeleton appears → crossfade again
Error:       ErrorState (no skeleton)
```

Implementation (see `app/(tabs)/index.tsx` and `app/anime/[slug].tsx`):
- `useSharedValue` for `skeletonOpacity`/`contentOpacity`, `useState` for `keepSkeleton`, `useRef` guards.
- **Guard variables:** `wasReady` (Home) / `wasShowingSkeleton` (Detail) refs prevent double-fires.
- Crossfade with `withTiming(0/1, { duration: 250 })`; on completion, `runOnJS(setKeepSkeleton)(false)`.
- Skeleton overlays via `StyleSheet.absoluteFill`.
- **Conditional rendering:** `hasContent && <Animated.View>` for content, `(keepSkeleton || !hasContent) && <Animated.View>` for skeleton.
- **Screen export pattern:** `export default function ScreenName() { return <ErrorBoundary><Content /></ErrorBoundary>; }`
- **Skeleton fidelity:** Read the real component first, mirror structure exactly. No invented layout elements.
- **Search:** simpler fade-in (150ms) via `Animated.Value` (no skeleton overlay, `Animated.timing` with `useNativeDriver: true`).
- **Episode modal:** `FadeIn` entering animation (staggered 50ms delay, 200ms duration).

## Screen & Hook Architecture

### Screen Layer (`app/`)

| File | Hook | Store(s) |
|------|------|---------|
| `app/(tabs)/index.tsx` | `useHomeScreen` | `homeStore`, `historyStore`, `settingsStore` |
| `app/(tabs)/search.tsx` | `useSearchScreen` | `searchStore`, `searchHistoryStore` |
| `app/(tabs)/settings.tsx` | (direct store access) | `uiStore` |
| `app/anime/[slug].tsx` | `useAnimeDetailScreen` | `playerStore`, `detailsStore`, `historyStore` |
| `app/player.tsx` | `useEpisodeNavigation` + `useAnimeData` | `playerStore`, `historyStore` |

### Hook Composition Pattern

```
useAnimeDetailScreen(slug)           // orchestrator hook
  ├── useAnimeData(slug)             // wraps useDetailsStore — tracks hasLoaded
  ├── useEpisodeUI()                 // selectedEpisode, isExpanded state
  ├── usePersistedRange(slug)        // persists episode range slider index
  └── useServerFetcher(slug, fetchServers) // AbortController management
```

### Custom Screen Hook Pattern (see `useHomeScreen`, `useSearchScreen`)

- Each screen has a dedicated `use<Screen>Screen()` hook.
- Selects individual fields from multiple stores via individual selectors.
- Composes UI state (loading, error, content) into a single return value.
- Computes derived data via `useMemo`.

## Store Patterns (Zustand)

- **Individual selectors:** `useStore((s) => s.field)` — never `useStore()` with whole state.
- **AbortController per store:** `homeController`, `detailsController`, `searchController`, `suggestionsController` — cancelled on new fetch or reset.
- **State fields follow:** `{ data[], isLoading, error }` shape.
- **Optimistic rollback:** history stores capture `previous` state before mutation, revert on persistence failure.
- **`withCache()`** for cached fetches, manual cache key construction for `servers_`/`stream_` prefixes.
- **Auth error recovery:** detect `error.type === "AUTH_ERROR"` → `refreshSession()` → retry operation.

## Player Architecture (`app/player.tsx` + `src/services/playerUI.ts`)

- **Video:** `expo-video` — `useVideoPlayer(null, ...)` + `<VideoView>` with `contentFit="contain"`.
- **Stream switching:** `player.replaceAsync({ uri, headers })` with cancellation flag to guard seek/play after unmount.
- **Immersive mode:** locks landscape, hides status bar + navigation bar. Cleanup restores portrait.
- **Progress save:** 10s interval via `setInterval` + save on `unmount`. Seek resume if progress > 10s.
- **Network-aware:** on connection loss, saves progress + pauses. Resumes on reconnect.
- **Episode navigation:** `useEpisodeNavigation(player, title, image)` — `resolveAndPlay()` handles prev/next.
  - Saves current episode progress before switching.
  - Auth error retry: catch AUTH_ERROR → refreshSession → retry.

## Component Patterns

- **Every screen** wrapped in `<ErrorBoundary>`.
- **Screen content** wrapped in `React.memo` (see `HomeContent`, `SearchScreenContent`, `AnimeDetailsContent`, `PlayerContent`).
- **Custom tab bar:** `tabBar={(props) => <FloatingTabBar {...props} />}` with Reanimated slide-up/down animation (250ms).
  - Visibility controlled by `useUIStore.tabBarVisible` via `useTabBarManager` scroll detection (8px threshold).
- **ScreenWrapper:** renders `ErrorState` when `!hasContent && error`, otherwise renders children.
- **AnimatedPressable:** base pressable component with scale animation.
- **ui/ components:** `Skeleton`, `ErrorState`, `SectionTitle`, `ActionRow`, `ImageWithLoader`.
- **Color scheme:** `bg-black` backgrounds, `bg-neutral-900` cards, `bg-neutral-950` elevated surfaces, `border-neutral-800` borders. Purple accent (`#A855F7`) for interactive elements.

## Navigation (`src/utils/navigation.ts`)

- `debouncedPush()` with 300ms lock prevents double-navigation.
- `navigateToAnime(slug)` → `/anime/${slug}`.
- `navigateToPlayer({ slug, number, title, image })` → `/player` with params.
- Stack animation: `slide_from_right` (default), `fade_from_bottom` (player).

## ESLint

Flat config at `eslint.config.js`. Type-aware rules enabled:
- `@typescript-eslint/no-floating-promises` (error) — Promises must be `void`-ed or `await`-ed or `.catch()`-ed.
- `@typescript-eslint/prefer-nullish-coalescing` (error) — Use `??` over `||` for null/undefined.
- `@typescript-eslint/switch-exhaustiveness-check` (error) — Switch on union types must cover all cases.
- `react-hooks/exhaustive-deps` (warn).
- `no-duplicate-imports` (error), `no-var` (error).

## CI/CD — Critical Gotchas

- `setup-android@v3` no longer accepts `api-level` or `build-tools` parameters.
- **`lightningcss` must be pinned to `1.30.1`** — `lightningcss@1.32.0` has a confirmed bug: `StyleSheetExit` visitor (used by `react-native-css` for Tailwind @layer rules) crashes with `failed to deserialize; expected an object-like struct named Specifier, found ()`. The `^1.30.1` range in `package.json` allows 1.32.x, so `npm ci` will install the broken version. Fix after `npm install`: `npm install lightningcss@1.30.1`.
- `react-native-worklets` is a required peer dependency of `react-native-reanimated` 4.x.
- `android/` is **not tracked in git** — generated via `npx expo prebuild --platform android` in CI.
- EAS production build: `buildType: "apk"`, `ndk: "27.1.12297006"`, `eas build --local`.
- Version bumps: edit both `package.json` (`version`) and `app.json` (`expo.version` + `expo.android.versionCode`). No manual `android/` edits.
- CI pipeline: `validate` (lint + tsc) → `build-android` (prebuild + EAS local build) → `create-release` (draft GitHub Release with changelog).
- Keystore decoded from `ANDROID_KEYSTORE_BASE64` secret into `android/app/release.keystore`.
- Gradle and Expo/EAS caches enabled via `actions/cache@v4`.

## Conventions

- **Dark theme only.** `StatusBar style="light"`.
- **Directory layout:** `src/{components,hooks,stores,services,utils,config}/`, types in `src/types.ts`.
- **Skeleton components:** `src/components/skeletons/` — one per screen (`HomeSkeleton`, `DetailSkeleton`, `SearchSkeleton`).
- **Base skeleton:** `src/components/ui/Skeleton.tsx` — Reanimated pulse opacity (0.3↔0.7, 800ms, `Easing.inOut(Easing.ease)`).
- **Logger:** `src/utils/logger.ts` — leveled logging (DEBUG/INFO/WARN/ERROR) with optional persistence. Use `logger.info(tag, msg)`, `logger.warn(tag, msg, error)`, `logger.error(tag, msg, error)`.
- **SourceError:** `src/utils/errors.ts` — extends `Error` with `type: AppErrorType` property.
- **Comments:** No section headers, no "what" comments, no JSDocs on self-explanatory code.
  Allowed: JSDoc on complex public APIs explaining non-obvious behavior; `// why` for workarounds, race conditions, platform bugs.
- **i18n:** Spanish UI strings throughout ("Inicio", "Buscar", "Ajustes", "Episodio", "Reintentar", "Error al cargar", etc.).
