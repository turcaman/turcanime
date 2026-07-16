# AGENTS.md

Instructions for AI coding agents working on this project. Complement to README.md — read that first for project overview.

## Quick Commands

```bash
npx tsc --noEmit              # typecheck (no emit)
npm run lint                   # ESLint 9 flat config (eslint.config.js)
npx tsc --noEmit && npm run lint  # both
```

No test framework — no `test` script.

## Project Overview

Expo 55 + React Native 0.83 app. **Android-only** (no iOS/web). File-based routing via `expo-router`.

- **Entry:** `app/_layout.tsx` → `app/(tabs)/` (Home, Search, Settings)
- **Routes:** `app/(tabs)/` (tab screens), `app/anime/[slug].tsx` (detail), `app/player.tsx` (player)
- **State:** Zustand stores in `src/stores/`. Use **individual selectors** (`useStore(s => s.field)`) — never full store subscription
- **Imports:** `@/*` maps to `./src/*`
- **Styling:** NativeWind v5 + Tailwind CSS v4. `global.css` entry: `@import "tailwindcss"; @import "nativewind/theme";` (no `@layer` wrappers)
- **TypeScript:** strict mode, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`

## Key Files Reference

| Purpose | File |
|---------|------|
| Source config (base URL, endpoints) | `src/config/source.ts` |
| Cache prefixes & TTLs | `src/config/cache.ts` |
| Session management | `src/services/session.ts` |
| HTTP fetcher with session | `src/services/source.ts` |
| HTML/RSC parser | `src/services/parsers.ts` |
| Stream decryption (Byse AES-GCM) | `src/services/extractors.ts` |
| Hidden WebView for Cloudflare | `src/components/WebViewWorker.tsx` |
| Cache utility | `src/utils/cache.ts` |
| Navigation helpers | `src/utils/navigation.ts` |
| Logger | `src/utils/logger.ts` |
| Error types | `src/utils/errors.ts` |
| Types | `src/types.ts` |

## Architecture

### Source & Streaming

- **Source:** `src/config/source.ts` — scraper configuration. TMDB images for posters.
- **Stream:** Direct HTTP fetch via `fetchWithSession` (no WebView for streaming).
  - Bridge page → iframe URL → `extractBest()` decrypts Byse payload via `@noble/ciphers` AES-GCM.
  - HLS master playlist → highest resolution selected.
- **Hidden WebView (`WebViewWorker`):** only for session init + refresh (Cloudflare validation, cookie acquisition).
- **Video:** `expo-video` (`VideoView` + `useVideoPlayer`). Not react-native-video or WebView.

### Session Management (`src/services/session.ts`)

- `SessionManager` class with deduplication via `refreshPromise`.
- `acquireFreshSession()`: returns existing `refreshPromise` if one is active, preventing concurrent refreshes.
- `waitForCookies()`: polls every 2s for up to 60s (30 attempts), checking that cookies have actually arrived.
- `fetchWithSession` in `src/services/source.ts`:
  - Waits for cookies, attaches session cookies + browser-like headers.
  - Captures `Set-Cookie` headers and merges into session.
  - Smart retry: 1 retry with 1s delay for non-401/403 HTTP errors and network errors.
  - Auth errors (401/403): throws `error.type = "AUTH_ERROR"` — does NOT call `invalidateCookies()`.

### Cache (`src/utils/cache.ts` + `src/config/cache.ts`)

- `withCache()` utility: returns cached value if available and not expired.
- **Stale threshold:** 30% of TTL — when remaining TTL falls below 30%, the entry is considered stale and a fresh fetch is performed (the stale entry is discarded).
- **Max entry size:** 1MB (`LIMITS.CACHE_MAX_ENTRY_SIZE`). Larger entries are logged and skipped.
- **Prefix-based TTLs:** `ch_home` → 6h, `search` → 30m, `suggestions` → 5m, `anime_` → 12h, `servers_` → 10m, `stream_` → 5m.
- **Cache invalidation:** `settingsStore.cacheInvalidationTimestamp` triggers re-fetch. On session refresh, all cache keys matching known prefixes are deleted.
- **Note:** Servers and stream use manual cache (direct `storage.get`/`storage.set`), not `withCache()`.

### Parser (`src/services/parsers.ts`)

- `HtmlParser` class with multiple extraction strategies (fallback chain per method).
- **Episode extraction:** RSC payload → script JSON → HTML regex fallback.
- **Detail extraction:** RSC data (poster/synopsis/relations) → JSON-LD → DOM → meta tags.
- RSC payload parsing via `self.__next_f.push` script detection.

## Auth Error Auto-Retry Pattern

Used across all data stores when `AUTH_ERROR` (session expired) is detected:

- **homeStore:** recursive `attempt()` with up to 2 retries, backoff 1s→2s, `force: true` on retry.
- **detailsStore:** single retry with `force: true`.
- **playerStore (fetchServers):** single retry with try/catch around retry.
- **playerStore (resolveStream):** `doResolve()` closure called twice (original + after refresh).
- **useEpisodeNavigation:** `attempt()` closure with `_retried` flag.

Key commits: `6b6159c`, `f40c3c8`, `a5e242e`, `02a71bd`.

## Session Refresh Flow (`app/_layout.tsx`)

1. **Triggers:** Connection type change, internet becomes reachable, app foreground after 5min idle, manual "Actualizar datos" in Settings.
2. `useHomeStore.getState().prepareRefresh()` — clears home data, shows skeleton.
3. `refreshSession()` via `sessionManager.acquireFreshSession()` (deduplicated).
4. If session refresh succeeds → clear all cache keys → `fetchHome(true)` → `invalidateCache()`.
5. If session refresh fails → `fetchHome(false)` (uses stale cache).
6. **Safety net:** 12s timer — if home data is still empty and not loading, retries `fetchHome(true)`.

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

### Custom Screen Hook Pattern

- Each screen has a dedicated `use<Screen>Screen()` hook.
- Selects individual fields from multiple stores via individual selectors.
- Composes UI state (loading, error, content) into a single return value.
- Computes derived data via `useMemo`.

## Store Patterns (Zustand)

- **Individual selectors:** `useStore((s) => s.field)` — never `useStore()` with whole state.
- **AbortController per store:** `homeController`, `detailsController`, `searchController`, `suggestionsController` — cancelled on new fetch or reset.
- **State fields follow:** `{ data[], isLoading, error }` shape.
- **Optimistic rollback:** history stores capture `previous` state before mutation, revert on persistence failure.
- **Auth error recovery:** detect `error.type === "AUTH_ERROR"` → `refreshSession()` → retry operation.

## Loading States & Transitions

- **Home & Detail:** Crossfade 250ms (skeleton 1→0, content 0→1) via `useSharedValue` + `withTiming` + `runOnJS`. Guard refs prevent double-fires.
- **Search:** Simpler fade-in (150ms) via `Animated.Value` with `useNativeDriver: true` (no skeleton overlay).
- **Episode modal:** `FadeIn` entering animation (staggered 50ms delay, 200ms duration).
- **Screen export pattern:** `export default function ScreenName() { return <ErrorBoundary><Content /></ErrorBoundary>; }`
- **Screen content** wrapped in `React.memo` where needed (`HomeContent`, `AnimeDetailsContent`).
- **Skeleton fidelity:** Read the real component first, mirror structure exactly. No invented layout elements.

## Player Architecture (`app/player.tsx` + `src/services/playerUI.ts`)

- **Video:** `expo-video` — `useVideoPlayer(null, ...)` + `<VideoView>` with `contentFit="contain"`.
- **Stream switching:** `player.replaceAsync({ uri, headers })` with cancellation flag to guard seek/play after unmount.
- **Immersive mode:** locks landscape, hides status bar + navigation bar. Cleanup restores portrait.
- **Progress save:** 10s interval via `setInterval` + save on `unmount`. Seek resume if progress > 10s.
- **Network-aware:** on connection loss, saves progress + pauses. Resumes on reconnect.
- **Episode navigation:** `useEpisodeNavigation(player, title, image)` — `resolveAndPlay()` handles prev/next with auth retry.

## Component Patterns

- **Every screen** wrapped in `<ErrorBoundary>`.
- **Custom tab bar:** `tabBar={(props) => <FloatingTabBar {...props} />}` with Reanimated slide-up/down animation (250ms). Visibility controlled by `useUIStore.tabBarVisible` via `useTabBarManager` scroll detection (8px threshold).
- **ScreenWrapper:** renders `ErrorState` when `!hasContent && error && onRetry`, otherwise renders children.
- **AnimatedPressable:** base pressable component with scale animation.
- **ui/ components:** `Skeleton`, `ErrorState`, `SectionTitle`, `ActionRow`, `ImageWithLoader`, `ProgressBar`.
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

## Workflows

### Add a new store
1. Create file in `src/stores/` following the pattern: Zustand `create()` with `{ data[], isLoading, error }` shape.
2. If the store fetches data, add an AbortController variable at module level (cancelled on new fetch or reset).
3. Export `use<Name>Store` with individual selectors.
4. If it needs initialization from storage, add to the init block in `app/_layout.tsx`.

### Add a new cache prefix
1. Add entry to `CACHE_PREFIXES` and `CACHE_TTL` in `src/config/cache.ts`.
2. Add the prefix to the cache-clearing filter in `app/_layout.tsx` (the `cacheKeys.filter(...)` block).

### Bump version
1. Edit `package.json` (`version` field).
2. Edit `app.json` (`expo.version` + `expo.android.versionCode`).
3. Do NOT edit `android/` — it's generated by prebuild.

### Add a new screen
1. Create file in `app/` following expo-router conventions.
2. Create a `use<Screen>Screen()` hook in `src/hooks/`.
3. Wrap screen in `<ErrorBoundary>`.
4. Add crossfade skeleton transition if it's a data-loading screen.

## CI/CD — Critical Gotchas

- `setup-android@v3` no longer accepts `api-level` or `build-tools` parameters.
- `react-native-worklets` is a required peer dependency of `react-native-reanimated` 4.x.
- `android/` is **not tracked in git** — generated via `npx expo prebuild --platform android` in CI.
- EAS production build: `buildType: "apk"`, `ndk: "27.1.12297006"`, `eas build --local`.
- Keystore decoded from `ANDROID_KEYSTORE_BASE64` secret into `android/app/release.keystore`.
- Gradle and Expo/EAS caches enabled via `actions/cache@v4`.

## Conventions

- **Dark theme only.** `StatusBar style="light"`.
- **Directory layout:** `src/{components,hooks,stores,services,utils,config}/`, types in `src/types.ts`.
- **Skeleton components:** `src/components/skeletons/` — one per screen (`HomeSkeleton`, `DetailSkeleton`, `SearchSkeleton`).
- **Base skeleton:** `src/components/ui/Skeleton.tsx` — Reanimated pulse opacity (0.3↔0.7, 800ms, `Easing.inOut(Easing.ease)`).
- **Logger:** `src/utils/logger.ts` — leveled logging (DEBUG/INFO/WARN/ERROR) with optional persistence. Use `logger.info(tag, msg)`, `logger.warn(tag, msg, error)`, `logger.error(tag, msg, error)`.
- **SourceError:** `src/utils/errors.ts` — extends `Error` with `type: AppErrorType` property.
- **Comments:** No section headers, no "what" comments, no JSDocs on self-explanatory code. Allowed: JSDoc on complex public APIs explaining non-obvious behavior; `// why` for workarounds, race conditions, platform bugs.
- **i18n:** Spanish UI strings throughout ("Inicio", "Buscar", "Ajustes", "Episodio", "Reintentar", "Error al cargar", etc.).

## 🚫 Rules — What NOT to Do

- Do NOT modify `src/services/source.ts` or `src/services/session.ts` without understanding the full session/cache/auth flow.
- Do NOT touch `android/` directory — it's generated by `expo prebuild` and not tracked in git.
- Do NOT add iOS or web-specific code — this is Android-only.
- Do NOT add a test framework — there is none configured.
- Do NOT use full store subscriptions (`useStore()` without selector) — always use individual selectors.
- Do NOT add JSDoc or comments to self-explanatory code.
- Do NOT change the color scheme (dark theme, purple accent) without explicit request.
- Do NOT add new dependencies without checking if the existing stack covers the need.