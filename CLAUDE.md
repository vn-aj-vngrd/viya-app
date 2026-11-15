# Viya

Viya is an AI travel companion for trips in the Philippines. A traveller chats with Viya to plan a trip, then runs it from a trip workspace: itinerary, places, budget, bookings, readiness, risks, vault, moments, notes, companions, recap, and a travel mode for the day itself. Product context lives in `docs/` (start with `docs/AI_GENERATION_AND_ARCHITECTURE.md`) and `README.md`.

## Repo map

- `apps/native` - the Expo SDK 56 / React Native 0.85 app (expo-router in `app/`, features in `src/features/<area>`, shared UI primitives in `src/components/ui`). Styling is Uniwind (Tailwind) with HeroUI Native; tokens live in `global.css` and `src/components/ui/tokens`.
- `packages/backend` - Convex functions and schema (`convex/`). Read `convex/_generated/ai/guidelines.md` before touching Convex code; `packages/backend/CLAUDE.md` says why.
- `packages/domain` - pure TypeScript trip logic (bookings, budget, readiness) with vitest tests beside the source.
- `packages/env`, `packages/config` - typed env and shared TS config.
- `DESIGN.md` - the design system. `HANDOVER.md` - device and simulator runbook with the exact `xcodebuild` and `devicectl` commands.
- `.claude/` - settings, subagents (`ui-reviewer`, `native-ios-builder`), commands (`/ui-check`, `/device-run`), skills (Convex, Clerk, Expo, HeroUI Native, AI SDK, Turborepo, Ultracite, Viya UI).

## Commands

Run from the repo root with bun.

- Dev: `bun run dev` (all), `bun run dev:native` (Expo), `bun run dev:server` (Convex), `bun run dev:setup` (first Convex setup).
- Types: `bun run check-types`, or `npx tsc --noEmit` inside `apps/native`.
- Lint and format: `npx ultracite check` and `npx ultracite fix` (Biome engine, tabs).
- Tests: `bun test apps/native` for app tests; `bun run test` inside `packages/domain` for domain tests.
- Native build: `cd apps/native && bun run ios`. Glass effects need a dev client, not Expo Go.

## Architecture

- Auth is Clerk; the Convex backend reads the Clerk JWT. Data is reactive Convex queries and mutations consumed through `convex/react` hooks.
- AI chat runs in Convex through `@convex-dev/agent`; the app streams it into the Viya chat screen.
- Business rules belong in `packages/domain` and stay free of React and Convex imports, so tests run fast.
- Screens compose `src/components/ui` primitives. Add a primitive there before repeating a pattern in a second screen.
- Android shares the iOS structure; glass falls back to solid translucent surfaces.

## UI work

Read `DESIGN.md` first and follow it exactly. Use the shared primitives, tokens and the `Icon` component (SF Symbols on iOS, Ionicons on Android). Keep content opaque and flat, glass only on the functional layer (native tab bar, toolbars, nav buttons, composer, sheet chrome), one primary action per screen, 44pt targets, Dynamic Type, accessibility labels, Reduce Transparency and Reduce Motion fallbacks, haptics on commits, motion only through the shared presets in `src/components/ui/motion.ts` (DESIGN.md section 10). Sheets get one handle only: the native or Gorhom handle, never a second custom one. Run the change on device per `HANDOVER.md` (`/device-run`), then audit it with `/ui-check`.

## Code standards (Ultracite, condensed; Biome enforces the rest)

- Type explicitly where it aids clarity; use `unknown` over `any`; narrow instead of asserting; name constants instead of magic numbers.
- Use arrow functions, `for...of`, optional chaining, `??`, template literals, destructuring, `const`.
- Await every promise; wrap async work in meaningful try/catch; throw `Error` objects; return early.
- Use function components, top-level hooks, complete dependency arrays, stable `key` ids, and components defined at module level.
- Remove `console.log` and `debugger`; prefer specific imports and skip barrel files.
- Give interactive elements labels and roles, and handle keyboard as well as touch.
- In tests, put assertions inside `it()`/`test()`, use async/await, and commit no `.only` or `.skip`.
- Spend review attention on business logic, naming, edge cases, empty/loading/error states, and accessibility.

## Definition of done

1. `npx tsc --noEmit` in `apps/native` has no new errors.
2. `npx ultracite check` is clean for the files you touched (generated `expo-env.d.ts` is a known exception).
3. `bun test` passes for the areas touched; note any test that already failed before your change.
4. UI changes were seen running on device or simulator in light and dark, or you state that the device was unavailable.
5. Leave changes uncommitted unless asked; commit subjects only, no body, no attribution, matching the repo's existing style.
