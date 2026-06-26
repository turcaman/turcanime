# Turcanime

Anime streaming app built with Expo 55 + React Native.

## Tech Stack

- **Framework:** React Native 0.83 via Expo 55
- **Routing:** expo-router (file-based)
- **State:** Zustand
- **Video:** expo-video + WebView-based stream extraction
- **Source:** AnimeLatinoHD

## Quick Start

```bash
npm install
npm start
```

## Commands

```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run lint       # Run ESLint
npx tsc --noEmit   # Type check
```

## Project Structure

```
app/                    # File-based routes (expo-router)
  (tabs)/               # Tab navigation (Home, Search, Settings)
  anime/[slug].tsx      # Anime detail screen
  player.tsx            # Video player
src/
  components/           # UI components
  lib/
    hooks/              # Custom React hooks
    store/              # Zustand state stores
    infrastructure/     # Providers, parsers, services
    domain/             # Entities, interfaces
    di.ts               # Dependency injection
```

## Build

Uses EAS Build. See `eas.json` for profiles.

```bash
eas build --platform android --profile production-apk
```
