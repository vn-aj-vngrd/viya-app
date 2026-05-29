# Trip Workspace AI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Viya from a phase/status-driven planner into a conventional trip workspace modeled after TripIt, Tripsy, Wanderlog, KAYAK Trips, Roadtrippers, and Sygic, with Viya AI embedded as an agent that can generate, refine, audit, and explain trip modules.

**Architecture:** The trip has one simple lifecycle: planning, traveling, completed, archived. Itinerary, bookings, documents, budget, readiness, risks, expenses, companions, notes, and memories become workspace modules with independent health states. Viya AI operates as a module agent: it can draft itinerary days/items, booking targets, budget estimates, checklist items, risk notes, travel-day alternatives, and recap copy, but generated changes are reviewable drafts before persistence.

**Tech Stack:** Expo Router, React Native, HeroUI Native, Convex, `@convex-dev/agent`, TypeScript, Bun, Vitest/domain tests, Ultracite/Biome.

---

## Current Implementation Status

Updated May 29, 2026.

Completed in the current refactor branch:

- Replaced legacy trip lifecycle with `planning | traveling | completed | archived`.
- Added backend workspace modules for itinerary, places, bookings, vault, budget/expenses, readiness, risks, moments, travel mode, recap, and reviewable Viya agent drafts.
- Added dedicated frontend screens for itinerary, places/map context, bookings, vault, budget, readiness, risks, travel mode, moments, and recap.
- Added create, edit, delete/status flows for trip profile, itinerary days/items, saved places, booking targets, expenses, readiness tasks, risks, vault items, and moments.
- Added Trip Workspace Viya agent draft panel with generate, review, apply, and dismiss actions.
- Added Trip Story/Recap lifecycle actions for completing and archiving a trip.
- Replaced raw Vault linked entity input with a picker for bookings, documents, moments, and readiness items.
- Added first-class Notes and Companions modules with Convex APIs, workspace summaries, routes, native screens, and planning checklist links.
- Added backend coverage for AI draft apply normalization through a pure helper used by the Convex mutation.
- Moved AI draft apply normalization out of the Convex function tree so generated bindings only include actual Convex modules.
- Added Travel Mode quick note capture backed by trip notes, alongside quick expense logging and current-item status updates.
- Expanded Trip Workspace Viya agent shortcuts to cover itinerary, bookings, places, budget, documents, readiness, risks, travel backup, and recap.
- Included trip notes in the workspace recent updates feed.
- Added a trip workspace contract test that enforces route files, `VIYA_ROUTES`, stack registrations, generated Convex modules, workspace fields, and Viya agent shortcut/backend-module alignment.
- Verified Convex codegen, focused native/backend TypeScript, focused Ultracite checks, backend prompt/draft tests, and domain trip module tests after the latest slice.
- Re-ran broader `bun x ultracite check`; the full repository check now passes across all 197 files after formatting/lint cleanup in tooling and config files.
- Loaded the running Expo web app at `http://localhost:8081` with Playwright at a mobile viewport; the bundle booted with 0 console errors and stopped at the expected unauthenticated sign-in sheet, so the authenticated trip-workspace flow still needs a signed-in manual smoke pass.
- Reloaded the running Expo web app after the latest Travel Mode and AI shortcut changes; it still boots with 0 console errors and stops at the expected unauthenticated sign-in sheet.
- Re-ran focused verification with the contract test included: `bun x convex codegen`, backend Convex TypeScript, native TypeScript, focused Ultracite, and 21 backend/domain tests all pass. Reloaded Expo web again at `http://localhost:8081`; it still reports 0 console errors and stops at auth.
- Re-ran verification after the repo-wide Ultracite cleanup: full `bun x ultracite check`, `bun x convex codegen`, backend Convex TypeScript, native TypeScript, and 21 backend/domain tests all pass. Expo web still reloads with 0 console errors and stops at the expected unauthenticated sign-in sheet.
- Fixed Clerk email-code sign-in/sign-up for the current sign-in-or-up transfer flow, including required password completion in development test mode.
- Fixed web bottom-sheet text input focus handlers by routing them through a compatible no-op handler on web while preserving the native bottom-sheet keyboard behavior.
- Fixed manual trip creation date state so the visible default start/end date is also committed to the form before validation.
- Added `apps/native/uniwind-types.d.ts` to the Biome/Ultracite ignore list because Uniwind regenerates it while the dev server/typecheck runs.
- Replaced HeroUI `ghost`/`outline` buttons with `tertiary` buttons and replaced problematic module-header `Chip` usage with local pill views to avoid HeroUI web color parser errors.
- Completed a signed-in Expo web smoke pass at mobile viewport using Clerk test mode: signed in, completed onboarding, created `Cebu smoke trip`, landed on the Trip Workspace, and verified direct module routes for itinerary, places, bookings, vault, readiness, risks, notes, companions, travel mode, and recap.
- Re-tested Vault, Readiness, and Recap after the HeroUI web fixes; all three render with 0 console errors. The remaining web console output is limited to known development warnings from React DevTools, Clerk dev keys, React Native Web pointer events, and Reanimated easing.
- Completed the full signed-in write-depth rendered smoke path on trip `k174zgg2ec3g5h9ncnqapp0gjh87ncrj`: edited profile, added itinerary content, saved a place, created/confirmed a booking, uploaded and synced a vault file, logged budget spend, updated readiness, added a risk, note, companion, travel-mode quick expense/note/current-item status, created/highlighted a moment, reviewed recap, marked complete, archived, generated a Viya agent itinerary draft, applied it, and verified the itinerary gained generated items.
- Replaced dashboard `Menu` usage with existing bottom-sheet patterns for trip options and lifecycle status to avoid HeroUI web menu parser/runtime issues.
- Fixed itinerary item creation so opening the item sheet after creating the first day selects that day instead of leaving the form blocked.
- Replaced readiness row status menus with direct inline status actions for faster checklist work and cleaner web behavior.
- Fixed Travel Mode document keying so document/vault duplicates render without React key collisions.
- Added a web-safe date picker fallback for bottom-sheet date fields and replaced the date-range inactive `ghost` button with `secondary` to avoid HeroUI web color conversion errors.
- Added local-dev deterministic Viya agent fallback handling when no AI provider key is configured, while keeping live provider generation available for production/provider-configured environments.
- Filtered the Trip Workspace agent panel to only show active `draft` agent drafts after apply/dismiss.
- Re-ran final verification after the rendered smoke fixes: full `bun x ultracite check --max-diagnostics 200`, `bun x tsc -p apps/native/tsconfig.json --noEmit`, `bun x tsc -p packages/backend/convex/tsconfig.json --noEmit`, `bun x convex codegen`, and 21 backend/domain tests all pass.
- Rechecked rendered Expo web routes after fixes: Trips list, Trip Workspace, Itinerary, Travel Mode, Moments, and Recap/archive paths render with 0 console errors; remaining console output is development-only warnings.

No remaining blockers for the scoped Trip Workspace refactor smoke path.

## UI Direction

The information architecture should follow top travel planners, but the visual design must stay native to Viya's current app:

- Use the existing Trips, Trip Workspace, and Viya chat visual language.
- Use HeroUI Native components as the primary UI building blocks: `Surface`, `Text`, `Button`, `BottomSheet`, `Chip`, `Menu`, `Separator`, `Spinner`, `Input`, `TextField`, and `CloseButton`.
- Use rounded, floating island controls for bottom actions and compact navigation, matching the current floating tab bar and floating Viya composer style.
- Keep the design clean, minimal, dense enough for trip management, and mobile-native.
- Prefer white/surface cards, subtle borders, soft blue icon wells, compact chips, and clear hierarchy.
- Do not introduce a new marketing-style visual system, heavy gradients, nested cards, or one-off controls.
- Use bottom sheets for task requirements, AI generated draft review, status changes, and compact forms.
- Keep module screens consistent: route header, summary card, list/timeline content, floating or bottom action where useful.

The target UI should feel like:

```txt
TripIt/KAYAK organization
+ Tripsy documents/expenses polish
+ Wanderlog itinerary/budget/checklist breadth
+ Roadtrippers/Sygic map/route module
+ Viya floating AI agent
+ existing Viya clean island UI
```

## Target User Flow

This is the product flow to implement first:

```txt
Trips list
→ Create trip
→ Trip Workspace
  → Overview
  → Itinerary
  → Map / route context
  → Bookings
  → Documents / Vault
  → Budget / expenses
  → Checklist / readiness
  → Notes / companions
  → Travel Mode
  → Memories / recap
```

The default path for a new trip:

```txt
Create trip
→ Enter destination, dates, travelers, optional budget and notes
→ Land on Trip Workspace Overview
→ Complete planning module cards
→ Use Travel Mode during active dates
→ Review recap and expenses after the trip
```

Viya AI is integrated into that same flow:

```txt
Ask Viya
→ Pick a module or receive a suggested module
→ Generate, refine, audit, or explain the module
→ Review structured draft changes
→ Apply accepted changes into the workspace
→ Show insight cards on Overview
→ Keep chat as explanation/history, not the primary data model
```

AI agent entry points in the workspace:

```txt
Trip Overview
→ Generate itinerary
→ Suggest booking targets
→ Estimate budget
→ Build readiness checklist
→ Find gaps / audit trip
→ Fix overloaded day
→ Create travel-day backup
→ Draft recap
```

## Product Rules

- The user-facing trip lifecycle is only `planning | traveling | completed | archived`.
- `booking` and `preparing` are not trip statuses. They are module/workstream concepts.
- `Trip Workspace` is the canonical home for a trip. Avoid separate mental models named dashboard, profile, tools, or phase screen.
- A user can work on bookings, documents, itinerary, and budget in any order.
- Task cards and bottom sheets explain module requirements; they do not imply a rigid phase gate.
- AI should help complete modules, audit gaps, generate drafts, and explain tradeoffs. It should not make the core flow depend on chat.
- AI-generated workspace changes require review before save unless the action is explicitly non-destructive, such as creating an insight or draft.

## Functional Completion Scope

This plan is complete only when the Trips module works end-to-end from planning through recap. A screen that only renders read-only sample data is not complete.

Each module must support this minimum behavior:

| Module | User can view | User can create | User can edit | User can delete/archive | AI can draft | Workspace reflects changes |
| --- | --- | --- | --- | --- | --- | --- |
| Trip profile | title, destination, dates, travelers, style, notes, budget | trip from manual form or AI draft | profile fields and lifecycle | archive/delete trip | initial draft trip | overview hero and trips list update |
| Itinerary | days and timeline items | day and item | day/item timing, cost, location, status | day/item | day plan and route refinement | today/next and map stats update |
| Map / places | places from itinerary and saved stops | saved place | place details and assigned day | saved place | route/stop suggestions | map and itinerary modules update |
| Bookings | booking targets and confirmations | target/booking | provider, dates, cost, status, linked doc | booking target | booking target list | readiness and budget update |
| Documents / Vault | uploaded files, extracted docs, linked bookings | upload/import/link | title, kind, link, note, status | vault item | document checklist suggestions | readiness and bookings update |
| Budget / expenses | wallet, category totals, recent expenses | budget and expense | budget and expense | expense | budget estimate and receipt hints | overview budget metrics update |
| Checklist / readiness | grouped readiness tasks and score | task | task details/status | task | readiness checklist | readiness score updates |
| Risks | active/mitigated/dismissed risks | risk | risk details/status | dismiss risk | risk audit | overview insights update |
| Companions | travelers, organizers, emergency contacts | companion | contact details, role, notes | companion | readiness/contact suggestions | overview modules and coordination state update |
| Notes | decisions, reminders, constraints, travel-day notes | note | title, category, body | note | travel context/checklist suggestions | recent updates and travel mode update |
| Travel Mode | today-first operating view | quick expense and note | active item status | dismiss surfaced issue | backup plan | travel view reflects current date |
| Moments / recap | moments, highlights, spend summary | moment | moment/caption/highlight | moment | recap draft | completed trip recap updates |

Backend completion means every module has authenticated Convex queries and mutations with trip ownership checks. Frontend completion means every route renders loading, empty, error, populated, create, edit, delete, and success states using the same HeroUI Native visual system.

## Backend API Completion Matrix

Existing backend modules should be extended instead of replaced unless a file has become too large to maintain.

```txt
packages/backend/convex/tripWorkspace.ts
- getTripWorkspace
- getTripModuleSummary

packages/backend/convex/trips.ts
- listTrips
- searchTrips
- getTripById
- createTrip
- updateTripProfile
- updateTripLifecycle
- updateTripBudget
- addTripExpense
- updateTripExpense
- deleteTripExpense
- archiveTrip
- deleteTrip

packages/backend/convex/itinerary.ts
- listTripItinerary
- createItineraryDay
- updateItineraryDay
- deleteItineraryDay
- createItineraryItem
- updateItineraryItem
- moveItineraryItem
- deleteItineraryItem

packages/backend/convex/places.ts
- listTripPlaces
- createSavedPlace
- updateSavedPlace
- assignPlaceToDay
- deleteSavedPlace

packages/backend/convex/bookings.ts
- listTripBookings
- createBookingTarget
- updateBooking
- updateBookingStatus
- linkBookingVaultItem
- deleteBooking

packages/backend/convex/vault.ts
- generateUploadUrl
- saveVaultItem
- confirmTripSyncReview
- listTripVaultItems
- updateVaultItem
- linkVaultItem
- deleteVaultItem

packages/backend/convex/readiness.ts
- listReadinessItems
- ensureBaselineReadinessItems
- createReadinessItem
- updateReadinessItem
- updateReadinessItemDetails
- deleteReadinessItem
- recalculateReadinessScore

packages/backend/convex/risks.ts
- listRisks
- createRisk
- updateRisk
- mitigateRisk
- dismissRisk
- deleteRisk

packages/backend/convex/moments.ts
- listTripMoments
- createMoment
- updateMoment
- toggleMomentHighlight
- deleteMoment

packages/backend/convex/notes.ts
- listTripNotes
- createTripNote
- updateTripNote
- deleteTripNote

packages/backend/convex/companions.ts
- listTripCompanions
- createTripCompanion
- updateTripCompanion
- deleteTripCompanion

packages/backend/convex/ai/tripAgent.ts
- generateTripAgentDraft
- listTripAgentDrafts
- applyTripAgentDraft
- dismissTripAgentDraft
```

Every create/update/delete mutation must patch the parent trip `updatedAt`. Mutations that affect readiness must recalculate `readinessScore`. Mutations that affect budget totals must be reflected by `getTripBudget` and `getTripWorkspace` without a separate refresh path.

## Target Screens And UI Composition

### Trips Home

Use the existing trips tab style with searchable/filterable trip cards and floating create actions.

```txt
Header island
- Trips
- Search/filter controls

Trip sections
- Current / next trip
- Upcoming
- Past

Trip card
- Destination/title
- Dates
- Next item or missing count
- Lifecycle chip
- Small progress indicators for itinerary/bookings/docs/budget

Floating action
- Create trip
- Import booking
- Ask Viya
```

### Trip Workspace Overview

This is the canonical trip home.

```txt
Sticky island header
- Back
- Lifecycle chip
- Share/settings

Trip hero card
- Title
- Destination route
- Dates + duration
- Travelers
- Readiness + budget metric row

Today / Next card
- Current item
- Next item
- Quick open Travel Mode

Viya insights island
- 1-3 insight cards
- Generate/refine/audit actions

Module grid/list
- Itinerary
- Map
- Bookings
- Documents
- Budget
- Checklist
- Notes/companions
- Memories/recap

Floating bottom island
- Trip profile shortcut
- Ask Viya
```

### Itinerary

```txt
Route header
Summary card: days, planned items, estimated cost
Horizontal day tabs
Timeline cards grouped by day
Floating actions: Add item, Generate with Viya, Optimize route
```

### Map / Places

```txt
Map placeholder or native map area
Day filter chips
Saved places / stops list
Route stats card
Actions: Add place, Assign to day, Optimize route, Open directions
```

### Bookings

```txt
Summary card: confirmed / total, missing confirmations
Grouped sections: flights, hotels, transport, activities, food, other
Booking target cards with provider, confirmation, dates, cost, linked document
Actions: Add target, Import confirmation, Ask Viya for booking targets
```

### Documents / Vault

```txt
Summary card: files, linked confirmations, offline readiness
Grouped sections: tickets, IDs, visas, insurance, confirmations, receipts
Document cards with link status and extracted summary
Actions: Upload, Scan/import, Link to booking
```

### Budget / Expenses

```txt
Wallet summary card: total, remaining, safe daily spend
Breakdown tiles: booked, planned, manual spend, receipts
Category list
Recent expenses
Actions: Set budget, Log expense, Attach receipt, Ask Viya to estimate
```

### Checklist / Readiness

```txt
Readiness score card
Grouped checklist sections: documents, bookings, packing, budget, transport, safety, weather, group, backup
Task rows with priority, due date, status, reason
Actions: Add task, Generate checklist, Audit trip
```

### Travel Mode

```txt
Today-first operational layout
Now / next
Tickets and confirmations
Important documents
Hotel/stay address
Daily safe spend
Open risks
Quick expense log
Floating Ask Viya
```

### Recap

```txt
Trip story card
Visited places / completed itinerary
Moments
Spend summary
Highlights
Actions: Draft recap with Viya, Export/share, Archive
```

## File Structure

Create:

- `packages/domain/src/trip-modules.ts` - module health selectors and workspace progress model.
- `packages/domain/src/trip-modules.test.ts` - module health tests.
- `packages/backend/convex/itinerary.ts` - authenticated itinerary day/item queries and mutations.
- `packages/backend/convex/places.ts` - saved places plus itinerary-derived place projections.
- `packages/backend/convex/moments.ts` - trip moment CRUD used by recap.
- `packages/backend/convex/ai/tripAgent.ts` - module draft generation, persistence, review, apply, and dismiss.
- `apps/native/src/features/trips/trip-workspace-types.ts` - UI model types for workspace sections, modules, insights, and quick actions.
- `apps/native/src/features/trips/trip-workspace-utils.ts` - maps Convex workspace data to the UI model.
- `apps/native/src/features/trips/trip-workspace-screen.tsx` - canonical trip workspace overview route.
- `apps/native/src/features/trips/trip-workspace-components.tsx` - workspace header, overview cards, module cards, AI insight cards, and task requirement sheet.
- `apps/native/src/features/trips/trip-workspace-tabs.tsx` - tab/section rendering for itinerary, bookings, documents, budget, checklist, travel, memories, and recap previews.
- `apps/native/src/features/trips/trip-places-screen.tsx` - map/places module with saved stops and route context.
- `apps/native/src/features/viya/viya-agent-types.ts` - structured AI agent draft types for module generation.
- `apps/native/src/features/viya/viya-agent-review-sheet.tsx` - bottom sheet for reviewing generated module changes.

Rename or gradually replace:

- `apps/native/src/features/trips/trip-dashboard-screen.tsx` -> `trip-workspace-screen.tsx`.
- `apps/native/src/features/trips/trip-dashboard-components.tsx` -> `trip-workspace-components.tsx`.
- `apps/native/src/features/trips/trip-dashboard-utils.ts` -> `trip-workspace-utils.ts`.
- `apps/native/src/features/trips/trip-dashboard-types.ts` -> `trip-workspace-types.ts`.
- `apps/native/src/features/trips/trip-dashboard-tabs.tsx` -> `trip-workspace-tabs.tsx`.

Modify:

- `packages/domain/src/types.ts` - remove `booking` and `preparing` from `TripStatus`.
- `packages/domain/src/constants.ts` - update status labels and status arrays.
- `packages/domain/src/trip-workspace.ts` - replace lifecycle-stage language with module progress language.
- `packages/domain/src/trip-workspace.test.ts` - rewrite tests for module health and next action.
- `packages/backend/convex/schema.ts` - constrain new writes to valid lifecycle values and remove old status assumptions.
- `packages/backend/convex/schema.ts` - add `savedPlaces` and `tripAgentDrafts`.
- `packages/backend/convex/trips.ts` - remove `booking`/`preparing` filters and accept only the new lifecycle.
- `packages/backend/convex/bookings.ts` - add booking target CRUD and vault linking.
- `packages/backend/convex/vault.ts` - add vault edit/link mutations.
- `packages/backend/convex/readiness.ts` - add readiness task CRUD around existing score recalculation.
- `packages/backend/convex/risks.ts` - add user-created risk CRUD.
- `apps/native/app/(app)/(tabs)/trips.tsx` - update filters and status chips to the simple lifecycle.
- `apps/native/app/(app)/trips/[tripId]/places.tsx` - add places route.
- `apps/native/src/features/trips/trip-status-pill.tsx` - remove user-facing booking/preparing presentations.
- `apps/native/src/constants/routes.ts` - add workspace-named route helpers while preserving the existing `/(app)/trips/[tripId]` route path.
- `apps/native/app/(app)/trips/[tripId]/index.tsx` - render `TripWorkspaceScreen`.
- `apps/native/src/features/viya/viya-chat-screen.tsx` - route AI outputs into module-level actions/insights.
- `apps/native/src/features/viya/viya-chat-components.tsx` - rename blueprint language where needed to workspace suggestions.
- `apps/native/src/features/viya/viya-chat-utils.ts` - parse AI draft outputs into typed module draft actions.
- `packages/backend/convex/ai/prompts.ts` - align AI prompts with workspace modules rather than lifecycle phases.

## Task 1: Define The New Domain Model

**Files:**

- Modify: `packages/domain/src/types.ts`
- Modify: `packages/domain/src/constants.ts`
- Create: `packages/domain/src/trip-modules.ts`
- Create: `packages/domain/src/trip-modules.test.ts`
- Modify: `packages/domain/src/index.ts`

- [ ] **Step 1: Update trip status types**

Change `TripStatus` in `packages/domain/src/types.ts` to:

```ts
export type TripStatus = "planning" | "traveling" | "completed" | "archived";
```

- [ ] **Step 2: Update status constants**

Change `TRIP_STATUS_LABELS`, `TRIP_STATUSES`, `TRIP_PLANNING_STATUSES`, and `TRIP_COMPLETED_STATUSES` in `packages/domain/src/constants.ts` to:

```ts
export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
	archived: "Archived",
	completed: "Completed",
	planning: "Planning",
	traveling: "Traveling",
};

export const TRIP_STATUSES = [
	"planning",
	"traveling",
	"completed",
	"archived",
] as const satisfies TripStatus[];

export const TRIP_PLANNING_STATUSES = ["planning"] as const satisfies TripStatus[];

export const TRIP_COMPLETED_STATUSES = [
	"completed",
	"archived",
] as const satisfies TripStatus[];
```

- [ ] **Step 3: Add module health model**

Create `packages/domain/src/trip-modules.ts`:

```ts
export type TripModuleId =
	| "itinerary"
	| "places"
	| "bookings"
	| "documents"
	| "budget"
	| "readiness"
	| "risks"
	| "expenses"
	| "companions"
	| "notes"
	| "memories"
	| "recap";

export type TripModuleHealth =
	| "empty"
	| "needsInput"
	| "inProgress"
	| "ready"
	| "issue";

export interface TripModuleSummary {
	health: TripModuleHealth;
	id: TripModuleId;
	label: string;
	primaryAction: string;
	requirements: Array<{
		detail: string;
		isComplete: boolean;
		label: string;
	}>;
	value: string;
}

export interface TripWorkspaceModuleInput {
	bookings: readonly { status: string; type: string }[];
	budgetAmount?: number;
	documents: readonly { status: string }[];
	expenses: readonly { amount: number }[];
	itineraryDays: readonly unknown[];
	itineraryItems: readonly { estimatedCost?: number; locationName?: string }[];
	readinessScore: number;
	risks: readonly { status: string }[];
	vaultItems: readonly { kind: string; status: string }[];
}

export const getTripModuleSummaries = ({
	bookings,
	budgetAmount,
	documents,
	expenses,
	itineraryDays,
	itineraryItems,
	readinessScore,
	risks,
	vaultItems,
}: TripWorkspaceModuleInput): TripModuleSummary[] => {
	const confirmedBookings = bookings.filter(
		(booking) => booking.status === "confirmed"
	);
	const documentCount =
		documents.length +
		vaultItems.filter((item) => item.kind === "document").length;
	const openRiskCount = risks.filter((risk) => risk.status === "open").length;
	const hasItinerary = itineraryItems.length > 0;
	const hasBudget = Boolean(budgetAmount);
	const hasExpenses = expenses.length > 0;

	return [
		{
			health: hasItinerary ? "inProgress" : "empty",
			id: "itinerary",
			label: "Itinerary",
			primaryAction: "Build itinerary",
			requirements: [
				{
					detail: itineraryDays.length
						? `${itineraryDays.length} days outlined`
						: "Add trip dates and day structure",
					isComplete: itineraryDays.length > 0,
					label: "Day outline",
				},
				{
					detail: hasItinerary
						? `${itineraryItems.length} planned items`
						: "Add places, meals, transfers, and activities",
					isComplete: hasItinerary,
					label: "Planned items",
				},
			],
			value: `${itineraryItems.length} items`,
		},
		{
			health:
				bookings.length === 0
					? "empty"
					: confirmedBookings.length === bookings.length
						? "ready"
						: "needsInput",
			id: "bookings",
			label: "Bookings",
			primaryAction: "Manage bookings",
			requirements: [
				{
					detail: `${confirmedBookings.length}/${bookings.length} confirmed`,
					isComplete: bookings.length > 0 && confirmedBookings.length === bookings.length,
					label: "Confirmations",
				},
			],
			value: `${bookings.length} targets`,
		},
		{
			health: documentCount > 0 ? "inProgress" : "empty",
			id: "documents",
			label: "Documents",
			primaryAction: "Open vault",
			requirements: [
				{
					detail: documentCount
						? `${documentCount} saved files`
						: "Upload IDs, tickets, permits, or confirmations",
					isComplete: documentCount > 0,
					label: "Travel files",
				},
			],
			value: `${documentCount} files`,
		},
		{
			health: hasBudget ? "ready" : "empty",
			id: "budget",
			label: "Budget",
			primaryAction: "Set budget",
			requirements: [
				{
					detail: hasBudget ? "Trip budget is set" : "Add a total trip budget",
					isComplete: hasBudget,
					label: "Budget cap",
				},
				{
					detail: hasExpenses ? "Expenses are being tracked" : "No expenses logged yet",
					isComplete: hasExpenses,
					label: "Expense tracking",
				},
			],
			value: hasBudget ? "Set" : "Not set",
		},
		{
			health:
				readinessScore >= 90
					? "ready"
					: readinessScore > 0
						? "needsInput"
						: "empty",
			id: "readiness",
			label: "Checklist",
			primaryAction: "Review checklist",
			requirements: [
				{
					detail: `${readinessScore}% ready`,
					isComplete: readinessScore >= 90,
					label: "Readiness score",
				},
			],
			value: `${readinessScore}%`,
		},
		{
			health: openRiskCount > 0 ? "issue" : "ready",
			id: "risks",
			label: "Risks",
			primaryAction: "Review risks",
			requirements: [
				{
					detail: openRiskCount
						? `${openRiskCount} open risks`
						: "No open risks",
					isComplete: openRiskCount === 0,
					label: "Open risks",
				},
			],
			value: openRiskCount ? `${openRiskCount} open` : "Clear",
		},
	];
};
```

- [ ] **Step 4: Add module tests**

Create `packages/domain/src/trip-modules.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { getTripModuleSummaries } from "./trip-modules";

const baseInput = {
	bookings: [],
	budgetAmount: undefined,
	documents: [],
	expenses: [],
	itineraryDays: [],
	itineraryItems: [],
	readinessScore: 0,
	risks: [],
	vaultItems: [],
};

describe("trip module summaries", () => {
	it("marks an empty planning workspace as empty or ready where appropriate", () => {
		const modules = getTripModuleSummaries(baseInput);
		const byId = new Map(modules.map((module) => [module.id, module]));

		expect(byId.get("itinerary")?.health).toBe("empty");
		expect(byId.get("bookings")?.health).toBe("empty");
		expect(byId.get("documents")?.health).toBe("empty");
		expect(byId.get("budget")?.health).toBe("empty");
		expect(byId.get("readiness")?.health).toBe("empty");
		expect(byId.get("risks")?.health).toBe("ready");
	});

	it("marks confirmed bookings and high readiness as ready", () => {
		const modules = getTripModuleSummaries({
			...baseInput,
			bookings: [{ status: "confirmed", type: "hotel" }],
			readinessScore: 95,
		});
		const byId = new Map(modules.map((module) => [module.id, module]));

		expect(byId.get("bookings")?.health).toBe("ready");
		expect(byId.get("readiness")?.health).toBe("ready");
	});

	it("marks open risks as issue", () => {
		const modules = getTripModuleSummaries({
			...baseInput,
			risks: [{ status: "open" }],
		});
		const riskModule = modules.find((module) => module.id === "risks");

		expect(riskModule?.health).toBe("issue");
	});
});
```

- [ ] **Step 5: Export module selectors**

Add to `packages/domain/src/index.ts`:

```ts
export * from "./trip-modules";
```

- [ ] **Step 6: Verify domain tests**

Run:

```bash
bun test packages/domain/src/trip-modules.test.ts packages/domain/src/trip-workspace.test.ts
```

Expected: module tests pass; existing trip-workspace tests may fail until Task 2 rewrites old lifecycle-stage expectations.

## Task 2: Remove Booking/Preparing From Lifecycle Logic

**Files:**

- Modify: `packages/domain/src/trip-workspace.ts`
- Modify: `packages/domain/src/trip-workspace.test.ts`
- Modify: `packages/backend/convex/trips.ts`
- Modify: `apps/native/src/features/trips/trip-status-pill.tsx`
- Modify: `apps/native/app/(app)/(tabs)/trips.tsx`

- [ ] **Step 1: Replace lifecycle-stage selector**

In `packages/domain/src/trip-workspace.ts`, replace `LifecycleStage = "booking" | "preparing" | "traveling"` with module-oriented next-action output:

```ts
export type TripWorkspaceNextActionTarget =
	| "itinerary"
	| "bookings"
	| "documents"
	| "budget"
	| "readiness"
	| "risks"
	| "travel";

export interface TripWorkspaceNextAction {
	description: string;
	label: string;
	target: TripWorkspaceNextActionTarget;
}
```

Implement selection order:

```txt
open risks -> bookings gaps -> documents empty -> budget empty -> readiness below 90 -> itinerary empty -> travel
```

- [ ] **Step 2: Rewrite lifecycle tests**

Replace assertions that expect `nextStage === "booking"` or `"preparing"` with next-action target assertions:

```ts
expect(summary.target).toBe("bookings");
expect(summary.label).toBe("Review booking targets");
```

- [ ] **Step 3: Update filters**

Remove `booking`, `preparing`, `status:booking`, and `status:preparing` from `searchTrips` filter validators and filter matching. This is a clean pre-production migration, so no legacy status fallback is required.

- [ ] **Step 4: Simplify status presentation**

In `trip-status-pill.tsx`, keep presentations only for:

```ts
planning
traveling
completed
archived
```

- [ ] **Step 5: Verify**

Run:

```bash
bun test packages/domain/src/trip-workspace.test.ts packages/domain/src/trip-modules.test.ts
bun x tsc -p apps/native/tsconfig.json --noEmit
bun x ultracite check packages/domain/src packages/backend/convex apps/native/src/features/trips apps/native/app/'(app)'/'(tabs)'/trips.tsx
```

Expected: no old lifecycle status appears in user-facing filters or status pills.

## Task 3: Rename Dashboard To Trip Workspace Without Breaking Routes

**Files:**

- Create: `apps/native/src/features/trips/trip-workspace-screen.tsx`
- Create: `apps/native/src/features/trips/trip-workspace-components.tsx`
- Create: `apps/native/src/features/trips/trip-workspace-utils.ts`
- Create: `apps/native/src/features/trips/trip-workspace-types.ts`
- Create: `apps/native/src/features/trips/trip-workspace-tabs.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/index.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/travel-mode.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/moments.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/wrapped.tsx`

- [ ] **Step 1: Copy dashboard files to workspace files**

Copy current trip dashboard feature files to workspace equivalents. Keep exports renamed:

```ts
TripDashboardScreen -> TripWorkspaceScreen
TripDashboardModel -> TripWorkspaceModel
createTripDashboardModel -> createTripWorkspaceModel
TripTab -> TripWorkspaceTab
```

- [ ] **Step 2: Keep route compatibility**

Do not change the route path in this task. `/(app)/trips/[tripId]` remains the trip workspace route.

- [ ] **Step 3: Update route imports**

Change `apps/native/app/(app)/trips/[tripId]/index.tsx` to:

```tsx
import { TripWorkspaceScreen } from "@/src/features/trips/trip-workspace-screen";

export default function TripWorkspaceRoute() {
	return <TripWorkspaceScreen />;
}
```

Update `travel-mode.tsx`, `moments.tsx`, and `wrapped.tsx` to use `TripWorkspaceScreen` with their initial tab equivalents.

- [ ] **Step 4: Remove old imports**

Run:

```bash
rg "trip-dashboard|TripDashboard|createTripDashboard|TripTab" apps/native/src apps/native/app
```

Expected: old names remain only in deleted files or none after cleanup.

- [ ] **Step 5: Delete old dashboard files**

Delete:

```txt
apps/native/src/features/trips/trip-dashboard-screen.tsx
apps/native/src/features/trips/trip-dashboard-components.tsx
apps/native/src/features/trips/trip-dashboard-utils.ts
apps/native/src/features/trips/trip-dashboard-types.ts
apps/native/src/features/trips/trip-dashboard-tabs.tsx
```

- [ ] **Step 6: Verify**

Run:

```bash
bun x tsc -p apps/native/tsconfig.json --noEmit
bun x ultracite check apps/native/src/features/trips apps/native/app/'(app)'/trips
```

Expected: route compatibility remains; naming now reflects product model.

## Task 4: Build Trip Workspace UI Foundation And Overview

**Files:**

- Modify: `apps/native/src/features/trips/trip-workspace-types.ts`
- Modify: `apps/native/src/features/trips/trip-workspace-utils.ts`
- Modify: `apps/native/src/features/trips/trip-workspace-components.tsx`
- Modify: `apps/native/src/features/trips/trip-workspace-screen.tsx`

- [ ] **Step 1: Establish shared workspace UI primitives**

Create or consolidate reusable components in `trip-workspace-components.tsx`:

```txt
WorkspaceIslandHeader
WorkspaceHeroCard
WorkspaceMetricRow
WorkspaceNextCard
WorkspaceModuleCard
WorkspaceInsightCard
WorkspaceFloatingIsland
ModuleRequirementSheet
```

Implementation rules:

- Use HeroUI Native primitives first: `Surface`, `Text`, `Button`, `BottomSheet`, `Chip`, `Menu`, `Separator`, `Spinner`, `Input`, `TextField`, and `CloseButton`.
- Match the existing Trips, Trip Workspace, and Viya chat style: white surfaces, soft borders, blue icon wells, compact chips, clear spacing, and floating island controls.
- Use cards only for actual grouped content, module rows, insight cards, and sheets. Do not nest cards inside cards.
- Keep typography compact and mobile-native. Avoid marketing hero layouts, large decorative gradients, or one-off visual treatments.
- Keep action placement consistent: primary actions in floating/bottom islands or bottom sheets, not scattered across every card.

- [ ] **Step 2: Add module summaries to workspace model**

In `trip-workspace-utils.ts`, call `getTripModuleSummaries()` using Convex workspace data and expose:

```ts
modules: TripModuleSummary[];
primaryModules: TripModuleSummary[];
issueModules: TripModuleSummary[];
```

- [ ] **Step 3: Replace phase checklist with module cards**

The overview module card list should be:

```txt
Itinerary
Bookings
Documents
Budget
Checklist
Risks
```

Each card shows:

```txt
Icon
Label
Value
Health chip
Chevron
```

Tapping opens a bottom sheet with module requirements and a CTA to the module screen.

- [ ] **Step 4: Keep trip information in the workspace header and hero**

Header should show:

```txt
Trip title
Destination route
Dates and duration
Travelers
Lifecycle status
Actions menu
```

Hero card should show:

```txt
Trip title
Destination route
Dates + duration
Travelers
Readiness score
Budget status
```

- [ ] **Step 5: Add `Today / Next` preview**

If no active current item exists, show:

```txt
No current item
Add timed itinerary items to power Today.
```

If active/upcoming items exist, show the current and next scheduled item.

- [ ] **Step 6: Add consistent floating island actions**

The overview bottom island should expose:

```txt
Trip profile
Ask Viya
Primary next action
```

Use the same visual shape as the current floating trip and Viya controls. The island must not overlap scroll content, safe areas, or the tab bar.

- [ ] **Step 7: Verify on small viewport**

Run Expo web and inspect a 390x844 viewport:

```bash
bun --cwd apps/native start -- --localhost --port 8082
```

Expected: cards fit without text overlap, bottom sheet opens, module CTA routes correctly.

## Task 5: Implement Module Screen UI Pass

**Files:**

- Modify: `apps/native/src/features/trips/trip-workspace-tabs.tsx`
- Modify: `apps/native/src/features/trips/trip-workspace-components.tsx`
- Modify: `apps/native/src/features/budget/trip-budget-screen.tsx`
- Create: `apps/native/app/(app)/trips/[tripId]/places.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/itinerary.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/bookings.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/vault.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/budget.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/readiness.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/risks.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/travel-mode.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/moments.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/wrapped.tsx`

- [ ] **Step 1: Standardize module screen composition**

Every module screen should follow this composition:

```txt
Route header
Summary card
Primary content list/timeline/map area
Contextual empty state
Floating or bottom action island
Bottom sheet for add/edit/review flows
```

Use the same HeroUI Native styling rules from Task 4. Module screens should feel like siblings of the Trips tab and Viya chat, not separate products.

- [ ] **Step 2: Build the Itinerary module**

UI model:

```txt
Summary: days, planned items, estimated cost
Horizontal day tabs
Timeline cards grouped by day
Actions: Add item, Generate with Viya, Optimize route
```

The default empty state should invite adding the first day item or generating a draft itinerary. AI generation opens chat or a review sheet; it should not silently save.

- [ ] **Step 3: Build the Map / Places module**

UI model:

```txt
Map or map placeholder area
Day filter chips
Saved places / stops list
Route stats
Actions: Add place, Assign to day, Optimize route, Open directions
```

If native map integration is not already stable, ship the places list and route stats first with a clearly contained map placeholder.

- [ ] **Step 4: Build the Bookings module**

UI model:

```txt
Summary: confirmed / total, missing confirmations
Grouped sections: flights, stays, transport, activities, food, other
Booking target cards
Actions: Add target, Import confirmation, Ask Viya for targets
```

Booking targets are planning records until confirmed. Do not represent them as purchased bookings unless a confirmation exists.

- [ ] **Step 5: Build the Documents / Vault module**

UI model:

```txt
Summary: files, linked confirmations, offline readiness
Grouped sections: tickets, IDs, visas, insurance, confirmations, receipts
Document cards with linked booking status
Actions: Upload, Scan/import, Link to booking
```

- [ ] **Step 6: Build the Budget / Expenses module**

Keep the refined wallet direction, but align it with the workspace composition:

```txt
Summary: total, remaining, safe daily spend
Breakdown tiles: booked, planned, manual spend, receipts
Category list
Recent expenses
Actions: Set budget, Log expense, Attach receipt, Estimate with Viya
```

- [ ] **Step 7: Build the Checklist / Readiness module**

UI model:

```txt
Readiness score
Grouped tasks: documents, bookings, packing, budget, transport, safety, weather, group, backup
Task rows with priority, due date, status, reason
Actions: Add task, Generate checklist, Audit trip
```

Checklist rows can use bottom sheets for details and edits. Avoid making readiness a forced linear phase.

- [ ] **Step 8: Verify module UI consistency**

Run:

```bash
bun x tsc -p apps/native/tsconfig.json --noEmit
bun x ultracite check apps/native/src/features/trips apps/native/src/features/budget apps/native/app/'(app)'/trips
```

Expected: module screens share one composition, use HeroUI Native primitives, and do not introduce unrelated visual systems.

## Task 6: Normalize Create Trip Flow

**Files:**

- Modify: `apps/native/src/features/trips/manual-trip-create-sheet.tsx`
- Modify: `apps/native/src/features/trips/manual-trip-create-screen.tsx`
- Modify: `apps/native/app/(app)/(tabs)/trips.tsx`
- Modify: `apps/native/src/features/viya/viya-chat-components.tsx`
- Modify: `apps/native/src/features/viya/viya-chat-screen.tsx`

- [ ] **Step 1: Make manual creation the conventional default**

The primary create trip action should collect:

```txt
Trip name
Destination
Origin
Dates
Travelers
Budget
Travel style
Notes
```

The successful destination is always `VIYA_ROUTES.tripDashboard(result.tripId)` or the renamed route helper if changed.

- [ ] **Step 2: Reframe AI creation**

Rename user-facing AI create labels:

```txt
Plan with Viya AI -> Draft with Viya
Create planning trip -> Save draft trip
Trip Blueprint -> Draft plan
```

The AI path should still land in the same workspace and seed the same modules.

- [ ] **Step 3: Keep AI optional**

Users must be able to create and use a trip without opening chat.

- [ ] **Step 4: Verify**

Run:

```bash
bun x tsc -p apps/native/tsconfig.json --noEmit
bun x ultracite check apps/native/src/features/trips apps/native/src/features/viya apps/native/app/'(app)'/'(tabs)'/trips.tsx
```

Expected: both manual and AI-assisted creation land on the workspace.

## Task 7: Add Viya As A Workspace Agent And Insight Layer

**Files:**

- Modify: `packages/backend/convex/ai/prompts.ts`
- Create: `apps/native/src/features/viya/viya-agent-types.ts`
- Create: `apps/native/src/features/viya/viya-agent-review-sheet.tsx`
- Modify: `apps/native/src/features/viya/viya-chat-utils.ts`
- Modify: `apps/native/src/features/viya/viya-chat-components.tsx`
- Modify: `apps/native/src/features/viya/viya-chat-screen.tsx`
- Modify: `apps/native/src/features/trips/trip-workspace-components.tsx`

- [ ] **Step 1: Define AI insight shape**

Use this UI shape first:

```ts
export interface TripAiInsight {
	actionLabel: string;
	detail: string;
	id: string;
	severity: "info" | "warning" | "critical";
	targetModule:
		| "itinerary"
		| "bookings"
		| "documents"
		| "budget"
		| "readiness"
		| "risks"
		| "travel";
	title: string;
}
```

- [ ] **Step 2: Define AI agent draft shape**

Create `apps/native/src/features/viya/viya-agent-types.ts`:

```ts
export type ViyaAgentModule =
	| "itinerary"
	| "bookings"
	| "documents"
	| "budget"
	| "readiness"
	| "risks"
	| "travel"
	| "recap";

export type ViyaAgentDraftAction =
	| "generate"
	| "refine"
	| "audit"
	| "explain";

export interface ViyaAgentDraftBase {
	action: ViyaAgentDraftAction;
	id: string;
	module: ViyaAgentModule;
	rationale: string;
	title: string;
}

export interface ViyaItineraryDraft extends ViyaAgentDraftBase {
	module: "itinerary";
	days: Array<{
		date?: string;
		items: Array<{
			category: string;
			description: string;
			estimatedCost?: number;
			locationName?: string;
			startTime?: string;
			title: string;
		}>;
		title: string;
	}>;
}

export interface ViyaBookingTargetsDraft extends ViyaAgentDraftBase {
	module: "bookings";
	targets: Array<{
		notes: string;
		title: string;
		type: "flight" | "hotel" | "activity" | "transport" | "other";
	}>;
}

export interface ViyaBudgetDraft extends ViyaAgentDraftBase {
	module: "budget";
	currency: string;
	totalBudget?: number;
	items: Array<{
		amount: number;
		category: string;
		label: string;
	}>;
}

export interface ViyaReadinessDraft extends ViyaAgentDraftBase {
	module: "readiness";
	items: Array<{
		category: string;
		description: string;
		priority: "low" | "medium" | "high" | "critical";
		title: string;
	}>;
}

export interface ViyaRiskDraft extends ViyaAgentDraftBase {
	module: "risks";
	risks: Array<{
		message: string;
		severity: "low" | "medium" | "high" | "critical";
		suggestedAction: string;
		title: string;
		type: string;
	}>;
}

export interface ViyaTextDraft extends ViyaAgentDraftBase {
	module: "documents" | "travel" | "recap";
	items: Array<{
		body: string;
		title: string;
	}>;
}

export type ViyaAgentDraft =
	| ViyaItineraryDraft
	| ViyaBookingTargetsDraft
	| ViyaBudgetDraft
	| ViyaReadinessDraft
	| ViyaRiskDraft
	| ViyaTextDraft;
```

- [ ] **Step 3: Generate local deterministic insights**

Before adding persisted AI insights, derive deterministic insights from workspace data:

```txt
No itinerary items -> Build itinerary
Booking targets unconfirmed -> Review bookings
No documents -> Upload documents
No budget -> Set budget
Readiness below 90 -> Review checklist
Open risks -> Review risks
```

- [ ] **Step 4: Add workspace agent entry points**

In `trip-workspace-components.tsx`, add an `Ask Viya` or `Viya can help` section with module-specific actions:

```txt
Generate itinerary
Suggest booking targets
Estimate budget
Build checklist
Audit trip
```

Each action deep-links to Viya chat with route params:

```ts
{
	mode: "trip",
	tripId: model.tripId,
	agentAction: "generateItinerary"
}
```

- [ ] **Step 5: Add review sheet for generated drafts**

Create `viya-agent-review-sheet.tsx` with HeroUI `BottomSheet`. It receives:

```ts
{
	draft: ViyaAgentDraft | null;
	isApplying: boolean;
	onApply: (draft: ViyaAgentDraft) => void;
	onDismiss: () => void;
}
```

The sheet shows module, rationale, generated items, and two buttons:

```txt
Apply to trip
Keep as draft
```

Generated itinerary, booking targets, budget, readiness, and risks must not be silently written without this review.

- [ ] **Step 6: Render insight cards on Overview**

Add an `Insights` section above module cards. Show up to three highest-priority insights. Each insight routes to the target module or opens the module requirement sheet.

- [ ] **Step 7: Update AI prompt language**

Prompts should tell Viya to operate on modules:

```txt
When helping with a saved trip, identify the module being improved: itinerary, bookings, documents, budget, readiness, risks, travel, or recap.
Do not invent confirmed bookings, documents, live alerts, prices, or availability.
When generating itinerary, booking targets, budgets, checklist items, risks, or recap drafts, return concise structured suggestions that the user can review before saving.
For generated itinerary drafts, include realistic pacing, travel buffers, meals, rest, and estimated costs when possible.
For booking target drafts, create external booking targets only; never claim Viya can process payment.
```

- [ ] **Step 8: Parse draft outputs**

In `viya-chat-utils.ts`, add parser helpers for agent draft blocks. Use a stable markdown convention:

```md
## Viya Draft
Module: itinerary
Action: generate
Title: Balanced 4-day plan
Rationale: Keeps each day realistic with transit buffers.
```

Parse known module/action/title/rationale fields first. Treat generated item bodies as draft text if structured lists are incomplete.

- [ ] **Step 9: Verify**

Run:

```bash
bun test packages/backend/test/prompts.test.ts
bun x tsc -p apps/native/tsconfig.json --noEmit
bun x ultracite check packages/backend/convex/ai apps/native/src/features/viya apps/native/src/features/trips
```

Expected: AI wording aligns with module workflow, agent draft types compile, review sheet renders, and insight cards render without requiring chat.

## Task 8: Travel Mode And Recap Rules

**Files:**

- Modify: `apps/native/src/features/trips/trip-workspace-utils.ts`
- Modify: `apps/native/src/features/trips/trip-workspace-tabs.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/travel-mode.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/wrapped.tsx`

- [ ] **Step 1: Derive active lifecycle from dates**

Add helper:

```ts
export const getDerivedTripLifecycle = ({
	endDate,
	storedStatus,
	startDate,
	today,
}: {
	endDate: string;
	storedStatus: string;
	startDate: string;
	today: string;
}) => {
	if (storedStatus === "archived") {
		return "archived";
	}

	if (endDate && endDate < today) {
		return "completed";
	}

	if (startDate && endDate && startDate <= today && today <= endDate) {
		return "traveling";
	}

	return "planning";
};
```

- [ ] **Step 2: Make Travel Mode operational**

Travel Mode should prioritize:

```txt
Now / Next
Tickets and confirmations
Important documents
Safe daily spend
Open risks
Quick expense log
Ask Viya
```

- [ ] **Step 3: Make Recap post-trip**

Recap should prioritize:

```txt
Highlights
Moments
Spend summary
Completed itinerary
Caption/story draft with Viya
Archive trip
```

- [ ] **Step 4: Verify**

Run:

```bash
bun x tsc -p apps/native/tsconfig.json --noEmit
bun x ultracite check apps/native/src/features/trips apps/native/app/'(app)'/trips/'[tripId]'
```

Expected: active dates show Travel Mode content without requiring manual `traveling` status.

## Task 9: Clean Status Migration

**Files:**

- Modify: `packages/backend/convex/trips.ts`
- Modify: `packages/backend/convex/schema.ts`
- Modify: `packages/domain/src/constants.ts`
- Test: `packages/domain/src/trip-modules.test.ts`

- [ ] **Step 1: Remove old lifecycle values completely**

Delete `booking`, `preparing`, `status:booking`, and `status:preparing` from domain constants, backend validators, trip filters, status pills, and progress UI.

- [ ] **Step 2: Keep module progress instead of status progress**

Booking and preparation progress must appear only through module summaries, booking status, readiness score, requirements sheets, and next actions.

- [ ] **Step 3: Verify full changed surface**

Run:

```bash
bun test packages/domain/src/trip-modules.test.ts packages/domain/src/trip-workspace.test.ts packages/backend/test/prompts.test.ts
bun x tsc -p apps/native/tsconfig.json --noEmit
bun x ultracite check
```

Expected: all tests and checks pass.

## Task 10: Complete Backend Module APIs

**Files:**

- Modify: `packages/backend/convex/schema.ts`
- Modify: `packages/backend/convex/trips.ts`
- Create: `packages/backend/convex/itinerary.ts`
- Create: `packages/backend/convex/places.ts`
- Modify: `packages/backend/convex/bookings.ts`
- Modify: `packages/backend/convex/vault.ts`
- Modify: `packages/backend/convex/readiness.ts`
- Modify: `packages/backend/convex/risks.ts`
- Create: `packages/backend/convex/moments.ts`
- Modify: `packages/backend/convex/tripWorkspace.ts`

- [ ] **Step 1: Add saved places and agent draft tables**

Add these tables to `packages/backend/convex/schema.ts`:

```ts
savedPlaces: defineTable({
	tripId: v.id("trips"),
	title: v.string(),
	description: v.optional(v.string()),
	locationName: v.string(),
	address: v.optional(v.string()),
	latitude: v.optional(v.number()),
	longitude: v.optional(v.number()),
	assignedDayId: v.optional(v.id("itineraryDays")),
	category: v.string(),
	source: v.union(v.literal("user"), v.literal("ai"), v.literal("itinerary")),
	createdAt: v.number(),
	updatedAt: v.number(),
}).index("by_trip", ["tripId"]),
tripAgentDrafts: defineTable({
	tripId: v.id("trips"),
	ownerId: v.string(),
	module: v.union(
		v.literal("itinerary"),
		v.literal("places"),
		v.literal("bookings"),
		v.literal("documents"),
		v.literal("budget"),
		v.literal("readiness"),
		v.literal("risks"),
		v.literal("travel"),
		v.literal("recap")
	),
	action: v.union(
		v.literal("generate"),
		v.literal("refine"),
		v.literal("audit"),
		v.literal("explain")
	),
	title: v.string(),
	rationale: v.string(),
	payloadJson: v.string(),
	status: v.union(
		v.literal("draft"),
		v.literal("applied"),
		v.literal("dismissed")
	),
	createdAt: v.number(),
	updatedAt: v.number(),
}).index("by_trip_status", ["tripId", "status"]),
```

- [ ] **Step 2: Implement trip profile and expense mutations**

In `packages/backend/convex/trips.ts`, add:

```txt
updateTripProfile
updateTripLifecycle
updateTripExpense
deleteTripExpense
```

`updateTripProfile` accepts title, destination, startDate, endDate, arrivalTime, departureTime, budgetAmount, budgetCurrency, travelStyle, pace, groupType, and summary. It must reject blank title/destination and invalid date ordering. `updateTripLifecycle` accepts only planning, traveling, completed, and archived. Expense mutations must verify access through the expense's trip before patch/delete.

- [ ] **Step 3: Implement itinerary CRUD**

Create `packages/backend/convex/itinerary.ts` with authenticated ownership checks:

```txt
listTripItinerary(tripId)
createItineraryDay(tripId, date, dayNumber, title, summary, theme, estimatedCost, pace, weatherNote)
updateItineraryDay(dayId, fields)
deleteItineraryDay(dayId)
createItineraryItem(tripId, dayId, title, description, category, locationName, address, latitude, longitude, startTime, endTime, durationMinutes, estimatedCost, bookingId, priority, status, aiReason)
updateItineraryItem(itemId, fields)
moveItineraryItem(itemId, dayId, startTime, endTime)
deleteItineraryItem(itemId)
```

Deleting a day must delete that day's itinerary items. Updating an item with coordinates should also ensure a matching saved place exists with `source: "itinerary"`.

- [ ] **Step 4: Implement places CRUD**

Create `packages/backend/convex/places.ts`:

```txt
listTripPlaces(tripId)
createSavedPlace(tripId, title, locationName, category, description, address, latitude, longitude, assignedDayId)
updateSavedPlace(placeId, fields)
assignPlaceToDay(placeId, assignedDayId)
deleteSavedPlace(placeId)
```

The query should return saved places plus itinerary item locations in one normalized list so the map screen can work before a native map implementation is complete.

- [ ] **Step 5: Complete bookings CRUD**

Extend `packages/backend/convex/bookings.ts`:

```txt
createBookingTarget
updateBooking
linkBookingVaultItem
deleteBooking
```

Booking status values are `target`, `bookedExternally`, `confirmed`, `missing`, and `cancelled`. A booking with `status: "confirmed"` should have either a confirmation code, linked vault item, or explicit notes explaining the confirmation source.

- [ ] **Step 6: Complete vault update/link mutations**

Extend `packages/backend/convex/vault.ts`:

```txt
updateVaultItem
linkVaultItem
```

`linkVaultItem` accepts `linkedEntityType` and `linkedEntityId` and must verify the linked entity belongs to the same trip when a trip-scoped entity is used.

- [ ] **Step 7: Complete readiness CRUD**

Extend `packages/backend/convex/readiness.ts`:

```txt
createReadinessItem
updateReadinessItemDetails
deleteReadinessItem
```

Each mutation must call the existing readiness recalculation helper after writing.

- [ ] **Step 8: Complete risks CRUD**

Extend `packages/backend/convex/risks.ts`:

```txt
createRisk
updateRisk
deleteRisk
```

Risk status remains `open`, `mitigated`, and `dismissed`. Deleting should be available for user-created mistakes; generated risks should usually be dismissed or mitigated from the UI.

- [ ] **Step 9: Implement moments CRUD**

Create `packages/backend/convex/moments.ts`:

```txt
listTripMoments
createMoment
updateMoment
toggleMomentHighlight
deleteMoment
```

Moments are trip-scoped, may optionally reference an itinerary day, and are used by the recap screen.

- [ ] **Step 10: Expand workspace query**

Update `getTripWorkspace` to also return:

```txt
savedPlaces
agentDrafts
moduleSummaries
derivedLifecycle
```

Sort days by `dayNumber`, items by date/start time, bookings by start date, readiness by priority/status, risks by severity/status, and moments by creation date.

- [ ] **Step 11: Verify backend compile**

Run:

```bash
bun --cwd packages/backend x convex codegen
bun x tsc -p packages/backend/convex/tsconfig.json --noEmit
bun x ultracite check packages/backend/convex
```

Expected: generated API includes every function in the Backend API Completion Matrix and no ownership check is missing from trip-scoped mutations.

## Task 11: Implement Frontend Forms And Module Mutations

**Files:**

- Modify: `apps/native/src/features/trips/trip-workspace-components.tsx`
- Modify: `apps/native/src/features/trips/trip-itinerary-screen.tsx`
- Create: `apps/native/src/features/trips/trip-places-screen.tsx`
- Modify: `apps/native/src/features/bookings/booking-hub-screen.tsx`
- Modify: `apps/native/src/features/vault/trip-vault-screen.tsx`
- Modify: `apps/native/src/features/budget/trip-budget-screen.tsx`
- Modify: `apps/native/src/features/trips/trip-dashboard-tabs.tsx`
- Modify: `apps/native/src/features/moments/moments-screen.tsx`
- Create: `apps/native/app/(app)/trips/[tripId]/places.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/itinerary.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/bookings.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/vault.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/budget.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/readiness.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/risks.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/travel-mode.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/moments.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/wrapped.tsx`

- [ ] **Step 1: Create reusable module form sheets**

Create or consolidate bottom-sheet form components:

```txt
TripProfileSheet
ItineraryDaySheet
ItineraryItemSheet
SavedPlaceSheet
BookingTargetSheet
VaultLinkSheet
ExpenseSheet
ReadinessItemSheet
RiskSheet
MomentSheet
```

All sheets use HeroUI Native inputs/buttons, explicit labels, pending states, error text, and cancel/submit actions.

- [ ] **Step 2: Wire itinerary screen to mutations**

`TripItineraryScreen` must support:

```txt
add day
edit day
delete day
add item
edit item
move item to another day/time
delete item
mark item planned/confirmed/skipped/completed
generate itinerary with Viya
```

The screen must use day tabs and timeline cards, with a functional empty state that opens `ItineraryDaySheet` or starts a Viya draft.

- [ ] **Step 3: Add Places route and screen**

Add `VIYA_ROUTES.tripPlaces(tripId)` and route `apps/native/app/(app)/trips/[tripId]/places.tsx`. The screen must show saved places, itinerary-derived places, day filter chips, route stats, and add/edit/delete saved place flows.

- [ ] **Step 4: Wire bookings screen to mutations**

Booking screen must support add/edit/delete target, status changes, confirmation fields, cost/currency, external URL, notes, and linking a vault item.

- [ ] **Step 5: Wire vault screen to update/link/delete flows**

Vault screen must support upload/import, edit title/note/kind, link to booking/document/moment/readiness item, open/download preview, and delete.

- [ ] **Step 6: Wire budget screen to expense edit/delete**

Budget screen must support budget update, add expense, edit expense, delete expense, attach receipt, category totals, and recent expenses. Existing wallet UI should be kept and expanded, not replaced with a different visual system.

- [ ] **Step 7: Wire readiness screen to full task CRUD**

Readiness screen must support baseline generation, add task, edit task, status updates, delete task, category grouping, score display, and audit with Viya.

- [ ] **Step 8: Wire risks screen to full risk CRUD**

Risks screen must support add risk, edit risk, mitigate, dismiss, delete, and AI audit.

- [ ] **Step 9: Wire moments and recap**

Moments screen must support add/edit/delete/toggle highlight. Recap/wrapped screen must read moments, completed itinerary, expenses, and AI recap drafts.

- [ ] **Step 10: Verify frontend module behavior**

Run:

```bash
bun x tsc -p apps/native/tsconfig.json --noEmit
bun x ultracite check apps/native/src/features apps/native/app/'(app)'/trips
```

Expected: every Trips route compiles and every module has create/edit/delete or archive actions connected to Convex mutations.

## Task 12: Implement Viya Agent Draft Persistence And Apply Flow

**Files:**

- Create: `packages/backend/convex/ai/tripAgent.ts`
- Modify: `packages/backend/convex/ai/prompts.ts`
- Create: `apps/native/src/features/viya/viya-agent-types.ts`
- Create: `apps/native/src/features/viya/viya-agent-review-sheet.tsx`
- Modify: `apps/native/src/features/viya/viya-chat-screen.tsx`
- Modify: `apps/native/src/features/trips/trip-workspace-components.tsx`
- Modify: module screens that expose `Generate with Viya` actions

- [ ] **Step 1: Generate durable agent drafts**

`generateTripAgentDraft` receives `tripId`, `module`, `action`, and `userInstruction`. It loads `getTripWorkspace`, prompts Viya with current trip data, stores a `tripAgentDrafts` record with `payloadJson`, and returns the draft id plus parsed preview.

- [ ] **Step 2: Apply drafts through module mutations**

`applyTripAgentDraft` must parse the stored payload and apply by module:

```txt
itinerary -> create days/items
places -> create saved places
bookings -> create booking targets
budget -> update budget and create planned/manual expense suggestions only when accepted
readiness -> create readiness items
risks -> create risks
travel -> create risk/readiness backup items
recap -> create or update recap draft content for display
```

After apply, mark draft status `applied`. Dismiss marks `dismissed`.

- [ ] **Step 3: Review generated changes in UI**

`ViyaAgentReviewSheet` must show module, action, rationale, generated items, and `Apply to trip` / `Keep draft` / `Dismiss`. No itinerary, booking, budget, readiness, risk, travel, or recap draft may be silently applied.

- [ ] **Step 4: Add module-specific AI entry points**

Each module screen exposes exactly relevant actions:

```txt
Overview: audit trip, generate itinerary, estimate budget
Itinerary: generate day, optimize pacing
Places: suggest stops
Bookings: suggest booking targets
Documents: suggest required documents
Budget: estimate budget, categorize expenses
Checklist: build checklist
Risks: audit risks
Travel Mode: create backup plan
Recap: draft recap
```

- [ ] **Step 5: Verify AI draft flow**

Run:

```bash
bun test packages/backend/test/prompts.test.ts
bun x tsc -p packages/backend/convex/tsconfig.json --noEmit
bun x tsc -p apps/native/tsconfig.json --noEmit
bun x ultracite check packages/backend/convex/ai apps/native/src/features/viya apps/native/src/features/trips
```

Expected: generated drafts persist, review sheet can apply/dismiss, and applied drafts update the correct module data.

## Task 13: Complete Planning To Recap Runtime Flow

**Files:**

- Modify: `apps/native/app/(app)/(tabs)/trips.tsx`
- Modify: `apps/native/src/features/trips/manual-trip-create-screen.tsx`
- Modify: `apps/native/src/features/trips/manual-trip-create-sheet.tsx`
- Modify: `apps/native/src/features/trips/trip-workspace-utils.ts`
- Modify: `apps/native/src/features/trips/trip-workspace-screen.tsx`
- Modify: `apps/native/src/features/trips/trip-workspace-tabs.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/travel-mode.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/wrapped.tsx`

- [ ] **Step 1: Manual trip creation lands in workspace**

Creating a trip manually must collect title, destination, origin if present, dates, travelers/group, budget, style, pace, and notes. Success routes to the workspace overview.

- [ ] **Step 2: Workspace next action follows real module gaps**

The next action selector should evaluate:

```txt
open critical risks
missing itinerary
missing booking targets
missing documents
missing budget
readiness below 90
trip active today
trip completed
```

It should never present booking/preparing as lifecycle phases.

- [ ] **Step 3: Travel Mode derives from dates**

During active dates, Travel Mode must show now/next itinerary, confirmations, documents, stay address, daily spend, open risks, quick expense log, and Ask Viya backup plan.

- [ ] **Step 4: Recap unlocks after trip**

After end date or completed lifecycle, Recap must show completed itinerary, moments, spend summary, highlights, draft recap action, and archive action.

- [ ] **Step 5: Verify full happy path manually**

Run the app and complete this smoke path:

```txt
create trip
open workspace
add itinerary day and item
add booking target
upload or save vault item
set budget
add expense
generate baseline checklist
complete readiness item
add risk and mitigate it
open travel mode
add moment
open recap
archive trip
```

Expected: each action updates the screen immediately through Convex subscriptions and no route crashes.

## Task 14: Final Verification And Release Gate

**Files:**

- Verify all changed Trips, domain, backend, and Viya files.

- [ ] **Step 1: Static checks**

Run:

```bash
bun x ultracite check
bun x tsc -p packages/domain/tsconfig.json --noEmit
bun x tsc -p packages/backend/convex/tsconfig.json --noEmit
bun x tsc -p apps/native/tsconfig.json --noEmit
```

- [ ] **Step 2: Domain/backend tests**

Run:

```bash
bun test packages/domain/src packages/backend/test
```

- [ ] **Step 3: Expo web smoke**

Run:

```bash
bun --cwd apps/native start -- --localhost --port 8082
```

Inspect at least:

```txt
/(app)/(tabs)/trips
/(app)/trips/[tripId]
/(app)/trips/[tripId]/itinerary
/(app)/trips/[tripId]/places
/(app)/trips/[tripId]/bookings
/(app)/trips/[tripId]/vault
/(app)/trips/[tripId]/budget
/(app)/trips/[tripId]/readiness
/(app)/trips/[tripId]/risks
/(app)/trips/[tripId]/travel-mode
/(app)/trips/[tripId]/moments
/(app)/trips/[tripId]/wrapped
```

Expected: no blank screens, no text overlap at 390x844, no unhandled console errors from Trips routes, bottom sheets open/close, and floating island actions remain above safe areas.

- [ ] **Step 4: Completion audit**

Check each row in Functional Completion Scope against current code and runtime behavior. Do not mark the goal complete unless every module has working backend mutations, frontend forms, workspace reflection, AI draft integration where listed, and verification evidence.

## Implementation Order

1. Domain status and module model.
2. Clean backend status migration with no legacy status support.
3. Complete backend module APIs and schema additions.
4. Workspace rename from dashboard/profile/tools to one product concept.
5. Shared Trip Workspace UI foundation using HeroUI Native and existing Viya island patterns.
6. Workspace overview rebuilt around module cards.
7. Module screens standardized around summary cards, lists/timelines, bottom sheets, and floating action islands.
8. Frontend forms and mutations wired for each module.
9. Create trip flow normalized.
10. Viya workspace agent draft persistence, review, apply, and insight cards.
11. Travel Mode and Recap rules.
12. End-to-end runtime smoke path.
13. Cleanup old names and status references.
14. Final static, test, and rendered UI verification.

## Acceptance Criteria

- User-facing trip statuses are only `planning`, `traveling`, `completed`, and `archived`.
- There is one canonical trip home called `Trip Workspace` in code and product language.
- `booking` and `preparing` no longer appear as trip filters, status chips, or status progress steps.
- Itinerary, bookings, documents, budget, checklist, risks, travel, and recap are modules inside the workspace.
- Every Trips module has authenticated backend queries and mutations with ownership checks.
- Every Trips module has working frontend create, edit, delete/archive, empty, loading, error, and populated states.
- Itinerary supports day and item CRUD, timing changes, status changes, and Viya-generated drafts.
- Places/map supports saved places, itinerary-derived places, day filters, and route stats.
- Bookings supports targets, confirmations, cost/status edits, vault linking, and AI target drafts.
- Documents/Vault supports upload/import, TripSync review, edit, link, preview, and delete flows.
- Budget supports budget edits, expense add/edit/delete, receipt linking, category totals, and AI estimates.
- Checklist supports baseline generation, task CRUD, status changes, readiness recalculation, and AI audits.
- Risks supports risk CRUD, mitigate, dismiss, delete, and AI risk audits.
- Travel Mode is operational during active trip dates and supports quick expense plus backup-plan AI action.
- Moments and recap support moment CRUD, highlights, spend summary, AI recap draft, and archiving.
- Workspace and module screens follow the existing Viya visual language from Trips, Trip Workspace, and Viya chat.
- HeroUI Native components are the default primitives for surfaces, text, buttons, chips, sheets, menus, inputs, and loading states.
- Floating island controls are consistent across overview, module screens, and Viya entry points.
- Module screens share a predictable route header, summary card, content list/timeline/map area, empty state, and action island.
- No new marketing-style hero layout, nested card structure, heavy gradient system, or one-off component family is introduced.
- A new trip can be created manually and used without AI.
- Viya can still draft a trip, but it lands in the same workspace flow.
- Viya can generate reviewable drafts for itinerary, booking targets, budget estimates, readiness items, risks, travel alternatives, and recap text.
- Generated module changes are reviewed in a bottom sheet before applying to the trip.
- AI insights appear on the workspace overview even before the user opens chat.
- No persisted seed, demo, generated, or manually created trip uses `booking` or `preparing` as a trip status.
- The manual smoke path from trip creation to archive passes without route crashes or stale workspace data.
- Domain tests, backend tests, Expo native typecheck, backend typecheck, and Ultracite pass.

## Self-Review

- Spec coverage: The plan covers lifecycle simplification, module states, workspace renaming, backend CRUD, frontend form flows, conventional create flow, Viya as a generating/auditing workspace agent, durable reviewable drafts, Travel Mode, Recap, and clean pre-production migration.
- Placeholder scan: No task contains TBD/TODO placeholders. The only deferred visual capability is a fully native map; the places list, itinerary-derived pins, filters, and route stats must ship first so the module is functional.
- Type consistency: `TripStatus`, `TripModuleId`, `TripModuleHealth`, `TripModuleSummary`, `TripAiInsight`, `ViyaAgentDraft`, `savedPlaces`, and `tripAgentDrafts` are defined before use.
