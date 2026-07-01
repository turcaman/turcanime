# AGENTS.md

## Quick Commands

```bash
npx tsc --noEmit          # typecheck (no emit)
npx eslint . --max-warnings=0  # lint strict
npx tsc --noEmit && npx eslint . --max-warnings=0  # both
```

No `test` script defined. No test framework installed.

## Project

Expo 55 + React Native 0.83 app. File-based routing via `expo-router`.

- **Entry:** `app/_layout.tsx` → `app/(tabs)/` (Home, Search, Settings)
- **State:** Zustand stores in `src/stores/`
- **Source:** AnimeLatinoHD via `src/services/animeLatino.ts`
- **Stream:** WebView-based extraction via `src/services/webview.ts`

## Path Alias

`@/*` maps to `./src/*`. Use it for all imports.

## Conventions

- Dark theme only. `StatusBar style="light"`.
- Path alias `@/` for all src imports.
- Components: `src/components/`, hooks: `src/hooks/`, stores: `src/stores/`.
- Services: `src/services/`, utils: `src/utils/`, config: `src/config/`.
- Types: `src/types.ts` (single file).
- No unnecessary comments. Only add comments that explain *why*, not *what*.

## Documentation

- **JSDoc:** Keep concise (1 line). Public exports should be documented.
- **WHY comments:** Allowed for non-obvious workarounds, race conditions, platform bugs.
- **Regex/bitwise:** Delete explanations. Patterns are self-documenting.
