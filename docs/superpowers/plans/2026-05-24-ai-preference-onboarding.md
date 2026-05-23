# AI Preference Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build signed-in preference onboarding and use saved traveler preferences to tailor Home and Viya suggestions.

**Architecture:** Store durable account-level preferences in Convex, gate signed-in app routing on the presence of those preferences, and use a pure suggestion mapper to personalize client-side cards and prompts. Keep the onboarding route thin and place UI/state logic in a focused native feature folder.

**Tech Stack:** Expo Router, React Native, HeroUI Native, Clerk, Convex, TypeScript, Vitest, Ultracite/Biome.

---

## File Structure

- Create `packages/domain/src/preferences.ts`: shared preference types, defaults, option labels, suggestion mapper, and AI context formatter.
- Create `packages/domain/src/preferences.test.ts`: Vitest coverage for the deterministic mapper.
- Modify `packages/domain/src/types.ts`: add preference-specific normalized union types and extend `UserPreferences`.
- Modify `packages/domain/src/index.ts`: export preference helpers.
- Modify `packages/backend/convex/schema.ts`: add `userPreferences` table with `by_owner` index.
- Create `packages/backend/convex/preferences.ts`: authenticated `getCurrentPreferences` query and `upsertCurrentPreferences` mutation.
- Create `apps/native/src/features/onboarding/preference-onboarding-screen.tsx`: signed-in preference wizard.
- Create `apps/native/app/(app)/onboarding/preferences.tsx`: route wrapper for the wizard.
- Modify `apps/native/app/(app)/_layout.tsx`: redirect signed-in users without preferences to onboarding.
- Modify `apps/native/app/(app)/(tabs)/index.tsx`: use personalized Home suggestions.
- Modify `apps/native/src/features/viya/viya-chat-screen.tsx`: use personalized Viya prompt starters.
- Modify generated Convex API files by running Convex code generation if available.

## Tasks

### Task 1: Shared Preference Model And Suggestions

- [ ] **Step 1: Write failing mapper tests**

Create `packages/domain/src/preferences.test.ts` with tests for relaxed beach suggestions, fast food/hidden-gem suggestions, risk-focused wording, and fallback behavior.

- [ ] **Step 2: Run mapper tests and verify RED**

Run: `bun --filter @viya-app/domain test -- preferences.test.ts`

Expected: tests fail because `./preferences` does not exist.

- [ ] **Step 3: Implement preference types and mapper**

Add normalized preference unions to `packages/domain/src/types.ts`. Create `packages/domain/src/preferences.ts` with `defaultUserPreferences`, option metadata, `getPreferenceSuggestions`, and `formatPreferenceContext`.

- [ ] **Step 4: Export helpers and verify GREEN**

Export the new module from `packages/domain/src/index.ts`.

Run: `bun --filter @viya-app/domain test -- preferences.test.ts`

Expected: tests pass.

### Task 2: Convex Preference Persistence

- [ ] **Step 1: Add schema table**

Modify `packages/backend/convex/schema.ts` to add `userPreferences` with the fields from the spec and `.index("by_owner", ["ownerId"])`.

- [ ] **Step 2: Add preference functions**

Create `packages/backend/convex/preferences.ts` with authenticated `getCurrentPreferences` and `upsertCurrentPreferences`. Use Convex validators for all args and call `ensureUserRecord` before writes.

- [ ] **Step 3: Regenerate Convex API types**

Run the repository's Convex codegen path if available. If codegen requires a live deployment and cannot run locally, update the checked-in generated API minimally only if typechecking requires it.

### Task 3: Signed-In Onboarding Gate And Wizard

- [ ] **Step 1: Add preference onboarding screen**

Create `apps/native/src/features/onboarding/preference-onboarding-screen.tsx` with an 8-step wizard, chip/card choices, progress, back/continue controls, save retry error, and final save via `api.preferences.upsertCurrentPreferences`.

- [ ] **Step 2: Add route**

Create `apps/native/app/(app)/onboarding/preferences.tsx` as a thin wrapper around `PreferenceOnboardingScreen`.

- [ ] **Step 3: Gate app routing**

Modify `apps/native/app/(app)/_layout.tsx` to query `api.preferences.getCurrentPreferences` after auth loads and redirect users without preferences to `/(app)/onboarding/preferences`, while avoiding self-redirect on the onboarding route.

### Task 4: Personalized Suggestions In Home And Viya

- [ ] **Step 1: Wire Home suggestions**

Modify `apps/native/app/(app)/(tabs)/index.tsx` to query preferences, call `getPreferenceSuggestions`, and render personalized suggestion text in the main planning card while preserving existing layout.

- [ ] **Step 2: Wire Viya prompt starters**

Modify `apps/native/src/features/viya/viya-chat-screen.tsx` to query preferences, call `getPreferenceSuggestions`, and replace hard-coded empty-state prompt starters with personalized prompts.

### Task 5: Verification

- [ ] **Step 1: Run focused tests**

Run: `bun --filter @viya-app/domain test`

Expected: all domain tests pass.

- [ ] **Step 2: Run typecheck**

Run: `bun run check-types`

Expected: all package typechecks pass.

- [ ] **Step 3: Run Ultracite**

Run: `bun x ultracite check`

Expected: no formatting or lint failures remain.

