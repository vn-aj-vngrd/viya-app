# 04 App Architecture

## Purpose

This document defines how the Viya app should be structured so AI coding agents do not create inconsistent folders, duplicated logic, or messy feature boundaries.

## Recommended stack

- React Native / Expo
- TypeScript
- Expo Router
- HeroUI Native
- Convex for backend, database, functions, and realtime state
- OpenRouter or Vercel AI SDK compatible AI abstraction
- Zustand only if lightweight local client state is needed
- React Hook Form or simple controlled inputs depending on complexity

## Architecture principles

1. Feature-first structure.
2. Keep screens thin.
3. Keep UI reusable and product-specific components focused.
4. Move data access to Convex functions or service hooks.
5. Move AI prompt construction to dedicated AI modules.
6. Use shared types from a single source.
7. Use HeroUI Native primitives before custom UI.
8. Keep MVP-focused and avoid overengineering.

## Root folder structure

```txt
.
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── onboarding/
│   ├── trips/
│   ├── viya/
│   ├── moments/
│   └── profile/
├── convex/
│   ├── schema.ts
│   ├── trips.ts
│   ├── itinerary.ts
│   ├── readiness.ts
│   ├── risks.ts
│   ├── moments.ts
│   ├── ai.ts
│   └── users.ts
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── trip/
│   │   ├── itinerary/
│   │   ├── readiness/
│   │   ├── risk/
│   │   ├── travel-mode/
│   │   ├── moments/
│   │   └── wrapped/
│   ├── features/
│   │   ├── onboarding/
│   │   ├── trips/
│   │   ├── itinerary/
│   │   ├── readiness/
│   │   ├── risks/
│   │   ├── tripsync/
│   │   ├── travel-mode/
│   │   ├── moments/
│   │   └── wrapped/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   │   └── ai/
│   ├── constants/
│   ├── types/
│   └── utils/
├── docs/
│   └── ai-context/
├── AGENTS.md
└── CLAUDE.md
```

## Feature folder pattern

Each major feature may contain:

```txt
features/readiness/
├── components/
├── hooks/
├── screens/
├── services/
├── types.ts
├── constants.ts
└── utils.ts
```

Use this pattern only when the feature is large enough. Small features can reuse shared folders.

## Screen rule

Screens should only:

- Read route params.
- Call hooks.
- Compose components.
- Handle simple UI state.

Screens should not:

- Build AI prompts.
- Contain large business logic.
- Duplicate data transformations.
- Define large inline components.

## Data access rule

Use Convex functions as the source of truth for persistent data.

Client components should call:

- `useQuery(api.trips.getTripById, { tripId })`
- `useMutation(api.trips.createTrip)`
- `useAction(api.ai.generateItinerary)`

Avoid direct API fetching patterns unless the project intentionally adds a separate HTTP backend.

## AI service architecture

Keep AI behavior modular:

```txt
src/services/ai/
├── aiClient.ts
├── prompts/
│   ├── itineraryPrompt.ts
│   ├── readinessPrompt.ts
│   ├── riskPrompt.ts
│   ├── travelModePrompt.ts
│   ├── momentsPrompt.ts
│   └── wrappedPrompt.ts
├── schemas/
│   ├── itinerarySchema.ts
│   ├── readinessSchema.ts
│   ├── riskSchema.ts
│   └── wrappedSchema.ts
└── parsers/
```

## State management

Use server state from Convex first.

Use local state for:

- UI toggles
- current step
- temporary form inputs
- local filters
- modal open state

Use Zustand only for:

- global demo controls
- temporary offline state
- cross-screen UI state that does not belong in Convex

## Naming conventions

- Components: `PascalCase`
- Hooks: `useSomething`
- Utils: `camelCase`
- Types: `PascalCase`
- Convex functions: `verbNoun`, e.g. `createTrip`, `generateItinerary`
- Files: kebab-case or camelCase; be consistent within the repo

## Error handling

Every async feature must support:

- loading state
- empty state
- error state
- retry path where appropriate

## Testing priorities

For MVP, prioritize:

- utility tests for readiness scoring
- schema validation tests for AI JSON parsing
- smoke tests for core screens
- manual demo checklist for hackathon flow
