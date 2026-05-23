# AI Preference Onboarding Design

## Goal

Build a signed-in onboarding flow that captures each user's travel vibe and durable preferences, then uses those preferences to personalize Home suggestions, trip suggestion prompts, and Viya AI suggestions.

## Scope

This project covers account-level preference onboarding after sign-in. It does not create a first trip, generate a full itinerary, or implement conversational preference extraction. Trip creation remains a later flow that can reuse these preferences as defaults.

## Existing Context

The app already has a polished pre-auth product tour at `apps/native/app/(auth)/index.tsx`. That tour marks onboarding as complete with local device storage through `apps/native/src/features/auth/onboarding-storage.ts`, which is useful for the marketing/auth experience but does not create account-level preference data.

Signed-in users currently route directly into `/(app)/(tabs)` from `apps/native/app/(auth)/_layout.tsx` and `apps/native/app/(app)/_layout.tsx`. Convex has a `users` table and user creation helpers, but no durable `userPreferences` table. Home and Viya prompt suggestions are currently hard-coded in native screens.

## Product Behavior

After a user signs in, the app checks whether that account has completed preference onboarding. Users without preferences are sent to a signed-in onboarding screen before they reach the main tabs. Users with preferences continue to the app normally.

The onboarding flow uses a balanced, structured questionnaire with eight questions:

1. Trip vibe: relaxed, balanced, packed, adventure, luxury, budget.
2. Daily pace: slow, moderate, fast.
3. Budget comfort: budget, mid-range, premium.
4. Interests: nature, food, culture, shopping, nightlife, wellness, beaches, hidden gems.
5. Food style: local eats, popular spots, dietary-aware, flexible, low priority.
6. Group style: solo, couple, family, friends, work, varies.
7. Planning style: Viya decides, give me options, only flag risks.
8. Special needs: accessibility needs, dietary restrictions, early starts, rest breaks, none.

The flow should feel short and action-oriented. Most questions are tap-to-select chips or cards. Interests and special needs allow multiple selections. Special needs can include a short optional note after the user selects a non-none option.

## Data Model

Add a Convex `userPreferences` table keyed by Clerk subject:

- `ownerId`: Clerk subject.
- `travelStyle`: `relaxed | balanced | packed | adventure | luxury | budget`.
- `pacePreference`: `slow | moderate | fast`.
- `budgetPreference`: `budget | midRange | premium`.
- `interests`: array of normalized interest strings.
- `foodPreference`: normalized food preference string.
- `groupPreference`: `solo | couple | family | friends | work | varies`.
- `planningStyle`: `decideForMe | giveOptions | flagRisks`.
- `specialNeeds`: array of normalized special-need strings.
- `specialNeedsNote`: optional string.
- `onboardingCompletedAt`: timestamp.
- `createdAt`: timestamp.
- `updatedAt`: timestamp.

Add an index named `by_owner` on `ownerId`. The table should store normalized values, not display labels, so suggestion logic and AI prompts do not depend on UI copy.

## Backend API

Add Convex functions for preferences:

- `getCurrentPreferences`: authenticated query that returns the current user's preferences or `null`.
- `upsertCurrentPreferences`: authenticated mutation that validates and saves the full preference payload, ensuring a user record exists first.

The mutation should save a complete preferences record in one operation. Partial saves are out of scope for the first build. If the user reruns onboarding later, the same mutation updates the existing record and preserves the original `createdAt`.

## Routing

Add a signed-in app route at `apps/native/app/(app)/onboarding/preferences.tsx`.

Update the signed-in app layout so it checks both auth state and `getCurrentPreferences`. The intended behavior is:

- Auth is loading: show the existing spinner.
- User is not signed in: redirect to `/(auth)`.
- User is signed in and preferences are loading: show a spinner.
- User is signed in and preferences are missing: redirect to `/(app)/onboarding/preferences`.
- User is signed in and preferences exist: render the app stack.

The preferences route itself must not redirect to itself while preferences are missing. After a successful save, replace the route with `/(app)/(tabs)`.

## Native UI

Create a focused preference onboarding feature under `apps/native/src/features/onboarding/`. Keep route files thin and move the wizard UI, question definitions, and payload mapping into feature files.

Recommended files:

- `preference-options.ts`: normalized option definitions and labels.
- `preference-onboarding-screen.tsx`: screen-level wizard UI.
- `preference-suggestions.ts`: pure mapper that turns preferences into suggestion cards and prompt starters.

The screen should use existing HeroUI Native and app styling patterns. It should have clear progress, a single primary action, a back action after the first question, disabled continue until required selections are made, and an inline retry state if saving fails.

## Suggestion Algorithm

Build the first suggestion algorithm as a deterministic mapper, not an AI call. It should combine strong user signals into short, concrete suggestions:

- `travelStyle` controls the overall wording and default trip framing.
- `pacePreference` controls activity density and rest language.
- `budgetPreference` controls price sensitivity.
- `interests` controls themes and prompt examples.
- `foodPreference` adds meal-related prompts when relevant.
- `planningStyle` controls whether suggestions are directive, option-based, or risk-focused.
- `specialNeeds` adds accessibility, dietary, rest, or timing safeguards.

The mapper should return a small, typed collection that can power:

- Home suggestion cards.
- Viya empty-state prompt starters.
- Future trip suggestion surfaces.

The mapper must be pure and covered by tests. It should have sensible fallbacks for incomplete records so the UI never breaks if old preference records are missing newer fields during development.

## AI Context

Viya should receive preference context as soft guidance. The AI must not treat preferences as confirmed trip details.

The prompt context should be concise, for example:

```text
Traveler preference context:
- Travel style: relaxed
- Pace: slow
- Budget comfort: midRange
- Interests: beaches, food, hidden gems
- Planning style: giveOptions
- Special needs: rest breaks

Use these as defaults when suggesting trips, but do not invent actual bookings, dates, or confirmed destination details.
```

For the first implementation, AI personalization means the empty-state prompt starters and suggested actions reflect the saved preferences. Do not prepend hidden preference context to the user's visible chat prompt, because that would make the chat history look like the user typed system context. A later refinement can attach preferences to agent thread context if the agent API supports per-user hidden context cleanly.

## Error Handling

If the preferences query is loading, show a spinner. If saving fails, keep the user on the current step and show a concise retryable error. If preferences cannot be loaded due to a transient backend problem, default to showing onboarding rather than skipping personalization.

The UI should not mark onboarding complete locally before preferences are saved. The signed-in source of truth is the Convex preferences record.

## Testing And Verification

Add focused tests for the pure suggestion mapper:

- Relaxed beach traveler gets slower beach-oriented suggestions.
- Fast food or hidden-gem traveler gets denser discovery suggestions.
- Risk-focused planning style changes prompt wording toward readiness and risk checks.
- Incomplete preference data falls back to balanced defaults.

Verify the end-to-end flow manually in Expo:

1. Sign in as a user with no preferences.
2. Confirm the app redirects to preference onboarding.
3. Complete all eight questions.
4. Confirm successful save routes to Home.
5. Confirm Home suggestions reflect selected preferences.
6. Open Viya and confirm prompt starters reflect selected preferences.
7. Restart the app and confirm the user is not onboarded again.

Run `bun x ultracite check` before committing implementation work.

## Out Of Scope

- Conversational AI preference extraction.
- First-trip creation.
- AI-generated recommendations from preferences.
- Preference editing from Profile.
- Migration or backfill for production users.
- Multi-device conflict resolution beyond last-write-wins updates.
