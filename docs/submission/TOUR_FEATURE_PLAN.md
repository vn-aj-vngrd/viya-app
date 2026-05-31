# Guided Product Tour Plan

## Goal

Add a guided tour that helps a first-time user understand Viya's core flow:

Home -> Create trip -> AI chat -> Trip workspace -> Itinerary -> Budget -> Vault -> Readiness.

The tour is planned after the current demo. It is not implemented yet.

## User Experience

The tour should appear as a lightweight onboarding layer, not a separate tutorial screen.

1. Home tour step: explain dashboard suggestions and the trip entry point.
2. Create trip step: point to the create trip action and explain that Viya asks only key planning questions.
3. AI chat step: explain Ask Viya as the place to ask, refine, and stage changes.
4. Workspace step: explain that a trip becomes a structured workspace, not just chat history.
5. Itinerary step: explain generated days, stops, buffers, and editable plans.
6. Budget step: explain budget ceiling, tracked spend, receipts, and daily context.
7. Vault step: explain uploaded travel proof, receipts, passes, and readiness notes.
8. Readiness step: explain that the flow ends when readiness checks confirm the traveler is prepared.

## Product Rules

- The tour must be dismissible.
- The tour must not block core app usage after dismissal.
- The tour should resume from the last incomplete step if the app closes.
- The tour copy must stay generic and trip-agnostic.
- Singapore can be used in demo screenshots, but the tour implementation must work for any trip.
- Readiness is the completion point for the current product story.

## Implementation Approach

Use a small persisted tour state model:

- `hasSeenMainTour`
- `activeTourId`
- `completedStepIds`
- `dismissedAt`

Render tour overlays from a shared configuration object keyed by screen and UI anchor. Each step should contain:

- `id`
- `screen`
- `anchor`
- `title`
- `body`
- `primaryActionLabel`
- `nextStepId`

Start with static local configuration in the native app. Move tour state to backend only if cross-device continuity becomes important.

## Acceptance Criteria

- New users see the tour from Home after onboarding.
- Returning users who dismissed or completed the tour do not see it again automatically.
- Users can restart the tour from settings or help.
- Tour steps cover Home, create trip, AI chat, workspace, itinerary, budget, Vault, and readiness.
- Tour labels do not mention unimplemented features as if they already exist.
- Readiness is presented as the final destination of the trip-preparedness flow.

## Demo Pitch Copy

Use this language in pitch materials:

> Guided Tour is a planned onboarding layer after the demo. It will walk users from Home to create trip, AI chat, workspace modules, and readiness without changing the core product flow.
