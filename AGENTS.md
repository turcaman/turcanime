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
- **State:** Zustand stores in `src/lib/store/`
- **Source:** AnimeLatinoHD via `src/lib/infrastructure/providers/AnimeLatinoProvider.ts`
- **Stream:** WebView-based extraction via `src/lib/infrastructure/services/WebViewBridge.ts`
- **DI:** `src/lib/di.ts` wires all concrete implementations

## Path Alias

`@/*` maps to `./src/*`. Use it for all imports.

## TS Rules (strict)

`verbatimModuleSyntax` enabled — use `import type { X }` for type-only imports, or inline `type` in mixed imports: `import { type X, value } from 'module'`.

`noUncheckedIndexedAccess` enabled — array/object indexing returns `T | undefined`. Add `!` assertion when safe, or null-check.

## ESLint Rules (strict)

Type-aware rules require `parserOptions.projectService`. Rules are scoped to `**/*.ts, **/*.tsx` files only.

Active strict rules: `no-floating-promises`, `strict-boolean-expressions`, `no-confusing-void-expression`, `prefer-nullish-coalescing`, `no-unnecessary-condition`, `switch-exhaustiveness-check`.

## Conventions

- Dark theme only. `StatusBar style="light"`.
- Path alias `@/` for all src imports.
- Components: `src/components/`, hooks: `src/lib/hooks/`, stores: `src/lib/store/`.
- Providers implement `IContentProvider` interface from `src/lib/domain/interfaces.ts`.
