# AGENTS.md

## Quick Commands

```bash
npx tsc --noEmit              # typecheck (no emit)
npx eslint . --max-warnings=0  # lint strict
npx tsc --noEmit && npx eslint . --max-warnings=0  # both
```

No `test` script defined. No test framework installed.

## Project

Expo 55 + React Native 0.83 app. **Android-only** (no iOS, web, or other platforms).
File-based routing via `expo-router`.

- **Entry:** `app/_layout.tsx` → `app/(tabs)/` (Home, Search, Settings)
- **State:** Zustand stores in `src/stores/`. Use **individual selectors** (`useStore(s => s.field)`) instead of full store subscription to avoid unnecessary re-renders.
- **Source:** Anime content API via `src/services/source.ts`
- **Stream:** Direct HTTP fetch via `fetchWithSession` (no WebView).
  - Bridge page fetched → iframe URL extracted from HTML → `extractBest()` decrypts Byse via `@noble/ciphers`.
  - Hidden WebView (`WebViewWorker`) only used for session init + refresh (Cloudflare validation, cookie acquisition).
- **Related animes:** Prequel/sequel/related extracted from RSC payload by `HtmlParser.extractRelations()`. Displayed as horizontal FlashList in `AnimeDetailsHeader`.

## Path Alias

`@/*` maps to `./src/*`. Use it for all imports.

## Conventions

- Dark theme only. `StatusBar style="light"`.
- Components: `src/components/`, hooks: `src/hooks/`, stores: `src/stores/`.
- Services: `src/services/`, utils: `src/utils/`, config: `src/config/`.
- Types: `src/types.ts` (single file).
- **Comments:** Only for logic the code itself doesn't explain.
  - No section headers (no banner comments, no `/** Section */` JSDocs).
  - No "what" comments (`// Fetch data`, `// Try cache first`).
  - No JSDocs on self-explanatory functions/constants/variables.
  - Allowed: JSDoc on complex public APIs explaining non-obvious behavior.
  - Allowed: `// why` for workarounds, race conditions, platform bugs.
