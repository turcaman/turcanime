# Turcanime

App Android para streaming de anime. Expo 55 + React Native 0.83.

## Stack

Expo 55 · TypeScript 5.9 strict · expo-router · Zustand 5 · NativeWind v5 + Tailwind 4 · expo-video · react-native-reanimated 4 · AsyncStorage

## Setup

```bash
npm install
npx expo prebuild --platform android
npx expo run:android
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npx tsc --noEmit` | Typecheck |
| `npm run lint` | ESLint |

## Estructura

```
app/              → Screens (expo-router)
src/
  components/     → UI components
  hooks/          → Custom hooks
  stores/         → Zustand stores
  services/       → HTTP scraper, parsers, extractors
  config/         → Source URLs, cache TTLs
  utils/          → Cache, storage, logger, navigation
```

## Convenciones

- Tema oscuro, acento morado (#A855F7)
- UI en español
- Sin tests
- Sin comentarios en código obvio
