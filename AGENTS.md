# Turcanime Project Agent

## Tech Stack
- React Native + Expo (SDK 55)
- TypeScript
- Zustand (state management)
- Clean Architecture (domain / application / infrastructure / presentation)

## Project Structure
```
src/
├── lib/
│   ├── domain/          # Pure logic, entities, interfaces
│   ├── application/     # Services, coordination
│   ├── infrastructure/  # External IO, parsers, providers
│   ├── core/           # DI, provider registry
│   ├── store/          # Zustand stores
│   └── hooks/          # React hooks
└── components/         # UI components
```

## Common Commands
```bash
npm run lint          # ESLint
npx tsc --noEmit      # Type check
```

## Key Patterns
- **DI**: All services via `getDeps()` in `src/lib/di.ts`
- **AbortController**: Always cleanup after fetch operations
- **Stores**: Optimistic updates with rollback on error
- **Parsers**: Multiple regex strategies with fallback

## Constraints
- Functions: ~50 lines max
- Files: ~500 lines max
- No business logic in UI components
