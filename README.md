# Turcanime

Anime streaming app built with **Expo 55** + **React Native 0.83**.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo 55 + React Native 0.83 |
| Routing | expo-router (file-based) |
| State | Zustand |
| Styling | NativeWind (Tailwind CSS v4) |
| Video | expo-video |
| Streaming | WebView-based extraction |

## Setup

```bash
npm install
npx expo prebuild --platform android
npx expo run:android
```

## Project Structure

```
app/                 → Screens (expo-router file-based routing)
src/
  components/        → UI components
  config/            → App configuration (source, cache)
  hooks/             → Custom React hooks
  services/          → Business logic (source, session, webview, parsers, extractors)
  stores/            → Zustand state stores
  types.ts           → All TypeScript types/interfaces
  utils/             → Utilities (cache, storage, logger, navigation, etc.)
```

## Available Scripts

```bash
npm start                   # Start Expo dev server
npx expo run:android        # Run on Android
npm run lint                # Run ESLint
npx tsc --noEmit            # TypeScript check
```

## CI/CD

Manual trigger via GitHub Actions — builds a signed APK and creates a GitHub Release.

## Architecture

The app scrapes anime content from a web source. Data flows:

```
User Action → Hook → Zustand Store → Service (source.ts) → HTTP + Parsing → UI
```

- **Services** (`src/services/`) handle HTTP requests, HTML parsing, session management, and stream extraction.
- **Stores** (`src/stores/`) manage UI state and caching.
- **Components** (`src/components/`) are pure React Native views styled with NativeWind.

Session cookies are maintained via a hidden WebView that handles Cloudflare validation. Stream URLs are resolved through a combination of WebView bridging and AES-GCM decryption.
