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

- **Entry:** `app/_layout.tsx` → `app/(tabs)/` (Home, Search, Settings)
- **State:** Zustand stores in `src/stores/`. Use **individual selectors** (`useStore(s => s.field)`) instead of full store subscription.
- **Imports:** `@/*` maps to `./src/*`.
- **Styling:** NativeWind v5 + Tailwind CSS v4. `global.css` entry: `@import "tailwindcss"; @import "nativewind/theme";` (no `@layer` wrappers).

## Architecture

- **Source:** AnimeLatinoHD (`src/config/source.ts`). TMDB images for posters.
- **Stream:** Direct HTTP fetch via `fetchWithSession` (no WebView for streaming).
  - Bridge page fetched → iframe URL extracted → `extractBest()` decrypts Byse via `@noble/ciphers`.
  - Hidden WebView (`WebViewWorker`) only for session init + refresh (Cloudflare validation, cookie acquisition).
- **Video:** `expo-video` (not react-native-video or WebView).
- **Cache:** `src/utils/storage.ts` with prefix-based TTLs in `src/config/cache.ts` (HOME 6h, SEARCH 30m, DETAILS 12h, SERVERS 10m, STREAM 5m).

## CI/CD — Critical Gotchas

- `setup-android@v3` no longer accepts `api-level` or `build-tools` parameters.
- **`lightningcss` must be pinned to `1.30.1`** — `lightningcss@1.32.0` has a confirmed bug: `StyleSheetExit` visitor (used by `react-native-css` for Tailwind @layer rules) crashes with `failed to deserialize; expected an object-like struct named Specifier, found ()`. The `^1.30.1` range in `package.json` allows 1.32.x, so `npm ci` will install the broken version. Fix after `npm install`: `npm install lightningcss@1.30.1`.
- `react-native-worklets` is a required peer dependency of `react-native-reanimated` 4.x.
- `android/` is **not tracked in git** — generated via `npx expo prebuild --platform android` in CI.
- EAS production build: `buildType: "apk"`, `ndk: "27.1.12297006"`, `eas build --local`.
- Version bumps: edit both `package.json` (`version`) and `app.json` (`expo.version` + `expo.android.versionCode`). No manual `android/` edits.

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
- `useSharedValue` for `skeletonOpacity`/`contentOpacity`, `useState` for `keepSkeleton`, `useRef` guards for double-fires.
- Skeleton overlays via `StyleSheet.absoluteFill`.
- **Skeleton fidelity:** Read the real component first, mirror structure exactly. No invented layout elements.
- **Search:** simpler fade-in (150ms) via `Animated.Value` (no skeleton overlay).
- **Episode modal:** `FadeIn` entering animation (staggered 50ms delay, 200ms duration).

## ESLint

Flat config at `eslint.config.js`. Type-aware rules enabled:
- `@typescript-eslint/no-floating-promises` (error)
- `@typescript-eslint/prefer-nullish-coalescing` (error)
- `@typescript-eslint/switch-exhaustiveness-check` (error)
- `react-hooks/exhaustive-deps` (warn)

## Conventions

- Dark theme only. `StatusBar style="light"`.
- Directory layout: `src/{components,hooks,stores,services,utils,config}/`, types in `src/types.ts`.
- Skeleton components: `src/components/skeletons/` — one per screen.
- Base skeleton: `src/components/ui/Skeleton.tsx` — Reanimated pulse opacity (0.3↔0.7, 800ms).
- **Comments:** No section headers, no "what" comments, no JSDocs on self-explanatory code.
  Allowed: JSDoc on complex public APIs explaining non-obvious behavior; `// why` for workarounds, race conditions, platform bugs.
