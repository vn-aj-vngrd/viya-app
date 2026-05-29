# Create Trip Onboarding Flow Design

## Goal

Refine trip creation into a short onboarding-style flow that helps users create a useful trip workspace in under one minute. The flow should feel consistent with the existing preference onboarding screen: full-screen steps, large titles, short helper copy, progress, simple choices, and one primary action per screen.

## Current Context

- `apps/native/app/(app)/trips/new.tsx` renders `ManualTripCreateScreen`.
- `ManualTripCreateScreen` is currently an older long-form screen.
- `ManualTripCreateSheet` already has the richer create fields, native date picker, Geoapify-backed location suggestions, and TripSync-oriented context fields.
- `PreferenceOnboardingScreen` establishes the app's onboarding pattern: full-screen intro, animated reveals, progress segments, large headings, rounded option cards, and restrained copy.
- The app currently has location autocomplete, but no installed map package. A real destination picker needs a map dependency or an interim map preview fallback.

## Flow Shape

Create Trip opens as a full-screen route, not a bottom sheet.

Screen 0 asks how the user wants to start:

- Plan with Viya
- Start manually

Manual mode stays short and collects only destination, dates, trip name, and traveler count before creating the trip workspace.

Plan with Viya uses a carousel:

1. Destination
2. Dates
3. Travelers
4. Style
5. Pace
6. Budget
7. Must-haves
8. Existing plans
9. Review
10. Starter preview, after generation is available

For MVP, the implementation can ship as:

1. Start choice
2. Destination
3. Dates
4. Travelers
5. Style + pace
6. Budget
7. Must-haves / existing plans
8. Review

## Destination And Map

The destination step should keep search as the fastest path and add map selection as a companion control:

- A large destination search field uses the existing `LocationSuggestionField` behavior.
- Popular destination chips provide quick entries.
- A `Choose on map` action opens an in-step map picker.
- The selected map anchor resolves back into the destination label used by trip creation.
- If no map provider is available in the first pass, show a map preview card and keep autocomplete as the source of truth; do not block the rest of the flow.

Recommended implementation direction: add `react-native-maps` for native map interaction if Expo compatibility is acceptable in this app. The map picker should remain scoped to destination selection and should not become a general map planning surface.

## Components

Create reusable trip setup primitives under `apps/native/src/features/trips/`:

- `TripCreateOnboardingScreen`: state machine and route-level orchestration.
- `CreateFlowShell`: full-screen layout, progress segments, back/skip/continue footer.
- `StartChoiceStep`: manual vs Viya choice.
- `DestinationStep`: destination search, popular chips, map picker entry.
- `DatesStep`: existing `DateRangePickerField` plus duration fallback chips.
- `TravelersStep`: traveler type chips and count input.
- `StylePaceStep`: multi-select style chips plus pace segmented options.
- `BudgetStep`: amount, total/per-person scope, strictness chips, skip.
- `ContextStep`: must-haves text plus optional booking text/file import affordance.
- `ReviewStep`: compact summary and create action.

Existing helpers should be reused where practical:

- `DateRangePickerField`
- `LocationSuggestionField`
- `useVaultUpload` and TripSync review components when import is wired
- existing `api.trips.createTrip`
- existing `api.ai.tripAgent.generateTripAgentDraft` when starter generation is wired

## Data Model

The route-level form state should match this shape:

```ts
type CreateTripInput = {
	mode: "manual" | "ai";
	destination?: string;
	startDate?: string;
	endDate?: string;
	durationPreference?: "weekend" | "3-4-days" | "5-7-days" | "1-2-weeks";
	travelers: {
		type: "solo" | "couple" | "friends" | "family" | "work";
		count: number;
	};
	styles: string[];
	pace: "light" | "balanced" | "packed";
	budget?: {
		amount: number;
		currency: "PHP";
		scope: "total" | "per_person";
		strictness: "flexible" | "moderate" | "strict";
	};
	mustHaves?: string;
	pastedBookingText?: string;
};
```

Existing `createTrip` accepts a smaller payload, so the first implementation should serialize extra context into the trip summary. A later backend update can persist structured create-flow metadata if needed.

## AI Generation

MVP should create the trip immediately from review and open the trip workspace. If Plan with Viya is selected, include selected answers in the trip summary so the existing Viya agent has useful context.

The generation screen and starter preview should be added once the backend can create and apply a starter bundle reliably. That can build on the existing trip agent draft APIs:

- generate itinerary draft
- generate places/readiness/budget suggestions
- apply accepted draft data
- show starter preview before opening the workspace

Do not block manual trip creation on AI generation.

## UX Rules

- One decision per screen.
- Keep copy short and practical.
- Use balanced defaults: traveler count `1`, pace `balanced`, currency `PHP`.
- Destination is required for creating a trip.
- Dates are optional for Viya mode but required for manual mode unless backend defaults are added.
- Budget, must-haves, and import are skippable.
- Preserve user control: generated plans are editable and can be skipped.

## Error Handling

- Validate required fields at step boundaries.
- Show inline messages using the existing danger text style.
- If location suggestions fail, allow manual destination text.
- If map selection fails, keep text search available.
- If file upload or extraction fails, preserve the flow and let the user continue without import.
- If trip creation fails, stay on review with a clear error.

## Testing

- Unit-test pure helpers for form validation, summary generation, and step eligibility.
- Add component-level coverage for selecting choices and moving between steps if the project test harness supports it.
- Run `bun x ultracite check` before finishing.
- Manually verify the route in Expo Go or web, depending on which local target runs fastest.

## Open Implementation Notes

- Confirm whether `react-native-maps` should be installed for this MVP or whether the first pass should use autocomplete plus a map preview card.
- Decide whether the Trips tab plus button should route directly to `/(app)/trips/new` instead of opening the existing bottom sheet.
- Keep the existing bottom sheet only if other flows still depend on it; otherwise route creation through the full-screen onboarding flow.
