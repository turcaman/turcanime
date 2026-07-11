# Turcanime

App de anime para Android — sin anuncios, sin cuentas, sin límites.

Built with **Expo 55** + **React Native 0.83**.

> Descarga el último APK en la [página de releases](https://github.com/turcaman/turcanime/releases).

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

## Requirements

- **Node.js** >= 20
- **Android SDK** — para builds locales
- Dispositivo físico o emulador Android

## Setup

```bash
npm install
npm install lightningcss@1.30.1    # pin necesario, ver abajo
npx expo prebuild --platform android
npx expo run:android
```

> **⚠️ lightningcss**: La versión `^1.30.1` en `package.json` permite que `npm install` instale `1.32.x`, que tiene un bug confirmado con `react-native-css`. Siempre hacer `npm install lightningcss@1.30.1` después de instalar dependencias.

## Available Scripts

| Comando | Descripción |
|---------|-------------|
| `npm start` | Iniciar dev server |
| `npx expo run:android` | Ejecutar en Android |
| `npm run lint` | ESLint (flat config, type-aware) |
| `npx tsc --noEmit` | TypeScript check |

## Project Structure

```
app/                    → Screens (expo-router)
src/
  components/           → UI components (AnimeCard, PlayerControls, FloatingTabBar, etc.)
  hooks/                → Custom hooks (useHomeScreen, useAnimeDetailScreen, etc.)
  stores/               → Zustand stores (home, search, player, history, settings)
  services/             → HTTP, session, parsers, extractors (AnimeLatinoHD scraper)
  config/               → Source URLs, cache TTLs
  utils/                → Cache, storage, logger, navigation helpers
  types.ts              → TypeScript types
```

## Features

- **Home** — Animes recién agregados, "Continue Watching" desde tu historial
- **Search** — Búsqueda con sugerencias automáticas + historial de búsquedas
- **Detail** — Sinopsis, géneros, animes relacionados, episodios con paginación
- **Player** — Reproductor nativo con soporte landscape, cambio de servidores, reanudación automática
- **Sin sesión** — No necesitas cuenta, el scraper maneja la autenticación del source automáticamente
- **Cache inteligente** — Resultados cacheados con TTLs por tipo (home: 6h, details: 12h, stream: 5min)

## Deployment

CI/CD via GitHub Actions (trigger manual):

1. `validate` — ESLint + TypeScript check
2. `build-android` — Prebuild + EAS build local → APK firmado
3. `create-release` — Draft release en GitHub con changelog

**Version bumps**: Editar `package.json` (version) y `app.json` (expo.version + expo.android.versionCode).

## Conventions

- **Dark theme** — UI en negro con acento morado (`#A855F7`)
- **Español** — Todos los strings de UI en español
- **Android-only** — Sin soporte iOS/web
- **No tests** — Sin framework de testing configurado
- **Sin JSDocs** — Comentarios solo para workarounds no obvios
