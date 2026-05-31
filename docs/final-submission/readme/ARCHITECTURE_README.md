# Viya Architecture README

## System Overview

Viya is split into four main layers:

1. Native mobile app in `apps/native`.
2. Convex backend in `packages/backend/convex`.
3. Shared domain package in `packages/domain`.
4. Environment and configuration packages in `packages/env` and `packages/config`.

## Native App

The Expo app uses Expo Router for file-based navigation.

Important route groups:

- `apps/native/app/(auth)` - onboarding and authentication entry.
- `apps/native/app/(app)/(tabs)` - Home, Trips, Vault, Moments, Profile, and Viya tabs.
- `apps/native/app/(app)/ai.tsx` - Ask Viya screen.
- `apps/native/app/(app)/trips/[tripId]/*` - trip workspace modules.

Feature code lives under `apps/native/src/features`:

- `auth`
- `home`
- `trips`
- `viya`
- `vault`
- `budget`
- `bookings`
- `readiness`
- `moments`

Shared components live under `apps/native/src/components`.

## Backend

Convex stores user-owned trip data and exposes queries, mutations, and actions.

Core backend areas:

- `schema.ts` - users, preferences, trips, itinerary, places, readiness, risks, moments, notes, companions, vault items, documents, bookings, budget entries, and chat metadata.
- `trips.ts` - trip CRUD and dashboard data.
- `itinerary.ts`, `bookings.ts`, `budget.ts`, `vault.ts`, `readiness.ts`, `risks.ts`, `places.ts` - module APIs.
- `chat.ts`, `agent.ts`, `ai/*` - AI chat and structured generation actions.

## Domain Package

`packages/domain` contains shared schemas and pure logic so app and backend contracts stay aligned.

Examples:

- Trip workspace types.
- Budget logic.
- Readiness score logic.
- Trip module constants.
- Zod schemas for AI structured outputs.
- Demo trip data used for fallback and tests.

## Data Ownership Pattern

Most records are scoped by either:

- `ownerId` for user-owned top-level data, or
- `tripId` for records attached to a specific trip.

Convex auth helpers map Clerk identity to the current user. Backend functions should not trust client-provided ownership when a server-side identity check is possible.

## Navigation Pattern

Route helpers are centralized in `apps/native/src/constants/routes.ts`. Trip module routes are generated from a Convex trip ID and route leaf, which keeps deep links consistent across dashboard cards, module switchers, and AI actions.

