# Turcanime

**Anime streaming app for Android** — no ads, no accounts, no limits.

Streams directly via HLS with native `expo-video`. Built with Expo 55 + React Native 0.83.

> Download the latest APK from the [releases page](https://github.com/turcaman/turcanime/releases).

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo 55 (`~55.0.27`) |
| Language | TypeScript 5.9 (strict) |
| Routing | expo-router (file-based) |
| State | Zustand 5 |
| Styling | NativeWind v5 + Tailwind CSS 4 |
| Video | expo-video |
| Animations | react-native-reanimated 4 |
| Cache | AsyncStorage + custom `withCache()` |
| Scraper | Direct HTTP fetch + RSC payload parsing |
| Stream | Byse AES-GCM decrypt → HLS |

## Requirements

- **Node.js** >= 20
- **Android SDK** — for local builds
- Physical device or Android emulator

## Setup

```bash
npm install
npx expo prebuild --platform android
npx expo run:android
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start dev server |
| `npx expo run:android` | Run on Android |
| `npm run lint` | ESLint (flat config, type-aware) |
| `npx tsc --noEmit` | TypeScript check |

## Features

- **Home** — Recently added anime + "Continue Watching" from your history
- **Search** — Search with autocomplete suggestions + search history
- **Detail** — Synopsis, genres, related anime, episode list with range pagination
- **Player** — Native video player with landscape mode, server switching, auto-resume
- **No login** — No account needed; the scraper handles source authentication automatically
- **Smart cache** — Cached results with per-type TTLs (home: 6h, details: 12h, stream: 5min)

## Project Structure

```
app/                    → Screens (expo-router file-based routing)
src/
  components/           → UI components (AnimeCard, PlayerControls, FloatingTabBar, etc.)
  hooks/                → Custom hooks (useHomeScreen, useAnimeDetailScreen, etc.)
  stores/               → Zustand stores (home, search, player, history, settings)
  services/             → HTTP, session, parsers, extractors (anime scraper)
  config/               → Source URLs, cache TTLs
  utils/                → Cache, storage, logger, navigation helpers
  types.ts              → TypeScript types
```

## Deployment

CI/CD via GitHub Actions (manual trigger):

1. `validate` — ESLint + TypeScript check
2. `build-android` — Prebuild + EAS local build → signed APK
3. `create-release` — Draft GitHub Release with changelog

**Version bumps**: Edit `package.json` (`version`) and `app.json` (`expo.version` + `expo.android.versionCode`).

## Conventions

- **Dark theme** — Black UI with purple accent (`#A855F7`)
- **Spanish UI** — All user-facing strings in Spanish
- **Android-only** — No iOS/web support
- **No tests** — No test framework configured
- **Minimal comments** — Only for non-obvious workarounds and race conditions