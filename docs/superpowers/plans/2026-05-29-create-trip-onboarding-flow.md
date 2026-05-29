# Create Trip Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the long-form trip create screen with an onboarding-style create flow that supports manual setup and Viya-guided setup.

**Architecture:** Keep route wiring unchanged by continuing to render `ManualTripCreateScreen` from `apps/native/app/(app)/trips/new.tsx`, but replace that component with a flow shell and focused step components. Extract pure helpers into a testable utility module so validation, summary generation, and payload mapping can be verified without rendering React Native.

**Tech Stack:** Expo Router, React Native, HeroUI Native, Convex mutations/actions, Bun test, Ultracite/Biome.

---

### Task 1: Pure Create Flow Helpers

**Files:**
- Create: `apps/native/src/features/trips/trip-create-flow-utils.ts`
- Create: `apps/native/src/features/trips/trip-create-flow-utils.test.mts`

- [ ] Write tests for manual validation, AI validation, budget parsing, summary generation, and Convex payload mapping.
- [ ] Run `bun test apps/native/src/features/trips/trip-create-flow-utils.test.mts` and verify the helpers are missing.
- [ ] Implement the helper module with exported types, constants, initial state, validation functions, summary generation, review rows, and create-trip payload mapping.
- [ ] Re-run the helper test and verify it passes.

### Task 2: Full-Screen Onboarding UI

**Files:**
- Replace: `apps/native/src/features/trips/manual-trip-create-screen.tsx`

- [ ] Use the helper module from Task 1.
- [ ] Build a full-screen shell with progress segments, back navigation, short copy, step content, and a sticky footer.
- [ ] Implement start choice, manual basics, destination, dates, travelers, style and pace, budget, context/import, review, generating, and starter preview states.
- [ ] Reuse `LocationSuggestionField` for destination search and `DateRangePickerField` for dates.
- [ ] Use a map-style destination anchor preview instead of adding a native map dependency in this pass.
- [ ] Call `api.trips.createTrip` from the review/generation path and route to the created trip workspace.

### Task 3: Trips Entry Point

**Files:**
- Modify: `apps/native/app/(app)/(tabs)/trips.tsx`

- [ ] Route the plus button to `VIYA_ROUTES.newTrip`.
- [ ] Keep the existing bottom sheet code untouched if removing it would broaden the change too much.

### Task 4: Verification

**Files:**
- Verify affected files only where possible.

- [ ] Run `bun test apps/native/src/features/trips/trip-create-flow-utils.test.mts`.
- [ ] Run `bun x ultracite check apps/native/src/features/trips/trip-create-flow-utils.ts apps/native/src/features/trips/trip-create-flow-utils.test.mts apps/native/src/features/trips/manual-trip-create-screen.tsx 'apps/native/app/(app)/(tabs)/trips.tsx'`.
- [ ] Start the app with `bun --cwd apps/native run web` or `bun --cwd apps/native run start` if web is not viable, and report the URL or any blocker.
