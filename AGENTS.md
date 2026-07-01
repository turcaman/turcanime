# AGENTS.md

## Quick Commands

```bash
npx tsc --noEmit              # typecheck
npx eslint . --max-warnings=0  # lint
npx tsc --noEmit && npx eslint . --max-warnings=0  # both
```

No `test` script defined. No test framework installed.

## Project

Expo 55 + React Native 0.83 app. File-based routing via `expo-router`.

- **Entry:** `app/_layout.tsx` → `app/(tabs)/` (Home, Search, Settings)
- **State:** Zustand stores in `src/stores/`
- **Source:** Anime content API via `src/services/source.ts`
- **Stream:** WebView-based extraction via `src/services/webview.ts`

## Path Alias

`@/*` maps to `./src/*`. Use it for all imports.

## Conventions

- Dark theme only. `StatusBar style="light"`.
- Components: `src/components/`, hooks: `src/hooks/`, stores: `src/stores/`.
- Services: `src/services/`, utils: `src/utils/`, config: `src/config/`.
- Types: `src/types.ts` (single file).
- **Comments:** Only add comments for logic the code itself doesn't explain.
  - No section headers (comment banners, `/** Section */` JSDocs).
  - No "what" comments (`// Fetch data`, `// Clear cache`, `// Try cache first`).
  - No obvious JSDocs on self-explanatory functions/constants.
  - Allowed: JSDoc on complex public APIs explaining non-obvious behavior (e.g. stale thresholds, error recovery).
  - Allowed: `// why` comments for workarounds, race conditions, platform bugs.
