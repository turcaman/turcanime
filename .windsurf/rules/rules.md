---
trigger: always_on
---

# Project Context

Turcanime is a React Native/Expo Android application for anime streaming.

**Tech Stack:**
- React Native 0.83.6, Expo ~55.0.18
- Expo Router for file-based navigation
- Zustand for state management
- TypeScript 5.9.2
- AsyncStorage for persistence
- React Native WebView for session management and video decryption

**Purpose:**
- Fetch anime content from external providers (currently AnimeLatinoHD)
- Stream video with embedded player support
- Maintain viewing history and favorites
- Support search and discovery

# Architecture Decisions

**Layered Architecture:**
- `/src/lib/domain` - Pure domain logic (entities, interfaces, repositories)
- `/src/lib/infrastructure` - External IO (providers, parsers, storage, services)
- `/src/lib/application` - Coordination layer (stores, hooks, config, utils)
- `/src/lib/core` - Composition root and factory patterns
- `/src/components` - Reusable UI components
- `/src/constants` - App-level constants (theme, layout, spacing)
- `/src/hooks` - Custom React hooks
- `/app` - Expo Router presentation layer (screens, layouts) - required by Expo

**Key Principles:**
- Domain layer must be pure (no side effects)
- Infrastructure handles all external IO (HTTP, storage, WebView)
- Presentation only orchestrates UI and user interactions
- Use constructor-based dependency injection via DI container
- Provider abstraction for multi-provider support
- Strategy pattern for parsing strategies

**Provider Abstraction:**
- All providers implement IContentProvider interface
- Provider factory for runtime provider selection
- Provider-specific logic isolated and swappable
- Configuration-driven provider initialization

# Code Style Rules

**Formatting:**
- Use 2-space indentation
- Use TypeScript strict mode
- Function names: camelCase
- Component names: PascalCase
- Interface names: PascalCase with 'I' prefix (IContentProvider, IStorage)
- Constants: UPPER_SNAKE_CASE
- File names: camelCase for utilities, PascalCase for components

**Naming:**
- Use descriptive and explicit names
- Prefer boolean prefixes: is, has, can
- Avoid generic names: data, obj, temp, var1
- Keep interfaces small and focused
- Do not expose internal implementation details

**Code Organization:**
- Prefer functional programming over classes
- Use classes only when state management is required (parsers, services, providers)
- Each function must have a single responsibility
- Prefer clarity over brevity
- Avoid unnecessary abstractions
- Split functions that are hard to understand
- Avoid magic (reflection, complex metaprogramming)

**Project Structure:**
- `/src/lib` - Business logic (domain, infrastructure, application, core)
- `/src/components` - Reusable UI components
- `/src/constants` - App-level constants
- `/src/hooks` - Custom React hooks
- `/app` - Expo Router screens and layouts (required by Expo, cannot be moved)
- `/tests` - Test files (co-located with source or in `__tests__` directories)

**Size Limits:**
- Functions: max 50 lines
- Classes: max 300 lines
- Files: max 600 lines
- Split immediately when limits are exceeded

# Code Quality

**Error Handling:**
- Use exceptions for error handling
- Do not mix exceptions with result types
- Do not ignore errors
- Use early returns for error conditions
- Handle AbortError for cancelled requests
- Distinguish error types (NETWORK_ERROR, AUTH_ERROR, SERVER_ERROR, NOT_FOUND, UNKNOWN)

**Code Structure:**
- Do not duplicate logic
- Extract shared logic when duplication becomes evident
- Avoid nested conditionals deeper than 2 levels
- Keep functions deterministic when possible
- Write comments only to explain why, not what
- Avoid redundant comments

**React Native Specific:**
- Use hooks for state management in components
- Avoid inline styles in components (use StyleSheet)
- Use SafeAreaView for proper spacing
- Handle loading and error states explicitly
- Use AbortController for cancellable async operations

# Testing Requirements

**Test Infrastructure:**
- Jest for unit and integration tests
- React Native Testing Library for component tests
- Test file mirrors source: `__tests__/` directory or co-located `.test.ts`

**Testing Priorities:**
- Write unit tests for critical modules (parsers, repositories, services)
- Test behavior, not implementation
- Mock external dependencies (HTTP, storage, WebView)
- Test error paths and edge cases
- Test provider interface compliance

**Coverage Goals:**
- Domain layer: 80%+ coverage
- Infrastructure layer: 70%+ coverage
- Application layer: 60%+ coverage
- Presentation layer: Component tests for critical UI flows

# Forbidden Patterns

**Do NOT:**
- Never use string concatenation for SQL queries (not applicable, but good practice)
- Never commit .env files or secrets
- Never use any/unknown types in TypeScript
- Never add dependencies without checking bundle size
- Never use innerHTML for user-provided content (React Native context)
- Never hard-code provider URLs or logic (use config)
- Never instantiate dependencies inside business logic (use DI)
- Never mix UI logic with business logic in stores
- Never use service locators
- Never place business logic in presentation layer
- Never ignore error handling in async operations
- Never create circular dependencies between layers

**React Native Specific:**
- Never use console.log in production (use logger)
- Never forget to cleanup subscriptions and timers
- Never use setState in render (use useEffect)
- Never pass functions as props without useCallback when needed
- Never create new objects/arrays in render without useMemo when needed

# Refactoring Guidelines

**When Modifying Code:**
- Improve code when modifying it
- Do not introduce new technical debt
- Do not refactor unrelated code
- Do not use patterns without clear necessity
- Do not generalize prematurely
- Keep changes minimal and scoped
- Maintain consistency with existing code
- Reuse existing code before creating new code

**Refactoring Priorities:**
- Fix violations of size limits first
- Extract shared logic when duplication becomes evident
- Improve error handling and type safety
- Add tests for critical modules
- Document complex logic

# AI Behavior

**When Making Changes:**
- Do not create unnecessary files
- Do not introduce dependencies without explicit justification
- Do not change architecture without explicit instruction
- Do not refactor unrelated code
- Respect all size and structure limits
- Prefer modifying existing files over creating new ones
- Keep changes minimal and scoped
- Follow the layered architecture strictly
- Use the DI container for dependency resolution