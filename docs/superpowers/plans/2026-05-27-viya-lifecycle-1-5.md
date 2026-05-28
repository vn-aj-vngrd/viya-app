# Viya Lifecycle 1-5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the MVP path from Planning Mode through Preparation Readiness: Plan -> Trip Agreement -> Book externally -> TripSync/Vault -> Readiness.

**Architecture:** Keep the existing chat-first Planning Mode and Trip Blueprint parser. Build the missing lifecycle surface around the persisted trip workspace: booking targets, trip-specific vault sync, extraction review, and readiness auditing. Prefer small domain selectors for display state, Convex queries/mutations for persisted workflow state, route-level screens that use the actual `tripId` from Expo Router params instead of the current placeholder route constants, and HeroUI Native primitives for nearly all UI.

**Tech Stack:** Expo Router, React Native, HeroUI Native, Convex, `@convex-dev/agent`, TypeScript, Bun tests, Vitest domain tests, Ultracite/Biome.

---

## UI Implementation Standards

Use the app's existing UI patterns heavily:

- Wrap route screens in `Container` from `apps/native/components/container.tsx`.
- Use HeroUI Native primitives for structure and actions: `Surface`, `Text`, `Button`, `BottomSheet`, `Menu`, `Chip`, `Spinner`, `ScrollShadow`, and `useThemeColor`.
- Use `Text.Heading`, `Text.Paragraph`, and `Button.Label` instead of raw text inside custom controls.
- Use `Surface` for cards, review sheets, status panels, and list containers. Follow the current app style: `rounded-[28px]` to `rounded-[34px]`, `border border-border`, `bg-surface`, `bg-surface-secondary`, `gap-*`, and `p-4`/`p-5`.
- Use HeroUI `BottomSheet` for TripSync review, status pickers, and any confirm/discard flow.
- Use HeroUI `Menu` for compact status changes when a full sheet is not needed.
- Use HeroUI `Chip` for lifecycle stage, booking status, priority, readiness category, and risk/status labels.
- Use HeroUI `Spinner` for loading and in-button pending states.
- Reuse existing local primitives where appropriate: `EmptyState`, `VaultPreviewCard`, `ReadinessScoreCard`, `TripHeader`, `NextBestActionCard`, and `ViyaMark`.
- Create custom components only as thin compositions of HeroUI primitives and existing app tokens. Do not introduce a new visual system, raw card styles, or one-off button implementations.
- Keep icons from `@expo/vector-icons/Ionicons`, matching the current app. Icons should sit inside HeroUI-driven rows/cards rather than replacing HeroUI components.
- Keep screens dense and mobile-native: no marketing-style hero pages, no nested cards, no decorative gradients/orbs, and no explanatory in-app copy about how the UI works.

## Current State Summary

Implemented or mostly implemented:

- Planning chat modes exist in `apps/native/src/features/viya/viya-chat-screen.tsx`.
- Plan mode prompt rules require focused follow-up questions and exact `## Trip Blueprint` sections in `packages/backend/convex/ai/prompts.ts`.
- The app parses Trip Blueprint markdown and renders a review card in `apps/native/src/features/viya/viya-chat-utils.ts` and `apps/native/src/features/viya/viya-chat-components.tsx`.
- `packages/backend/convex/trips.ts` can create a trip from a blueprint and seed itinerary outline, booking targets, readiness items, and risks.
- Vault upload storage exists in `packages/backend/convex/vault.ts` and `apps/native/src/features/vault/use-vault-upload.ts`.
- Readiness scoring exists in `packages/domain/src/readiness.ts`; Convex can list/update readiness items and recalculate the trip score.

Missing or incomplete:

- Planning Mode does not consistently open in Plan mode from home/trips entry points.
- Trip workspace routes use placeholder `CURRENT_TRIP_ID = "current"` in `apps/native/src/constants/routes.ts`, which means dashboard links can point at an invalid Convex id.
- Trip dashboard, itinerary, and readiness screens are placeholders.
- Booking targets are created but there is no Booking Hub, no status controls, and no external deep-link/provider surface.
- Trip Vault screen ignores route `tripId`, so uploads are not attached to the trip.
- TripSync extraction exists as an AI action draft, but it is not integrated into the upload/review/save flow.
- Vault save currently persists immediately; the product requirement says users review extracted details before saving useful trip updates.
- Readiness does not audit all required categories from actual bookings, documents, budget, packing, safety, schedule buffers, and emergency coverage.

## File Structure

Create:

- `packages/domain/src/bookings.ts` - booking status selectors and display helpers.
- `packages/domain/src/bookings.test.ts` - tests for booking progress and grouping.
- `packages/domain/src/trip-workspace.ts` - selectors for trip dashboard summaries, next action, and lifecycle stage state.
- `packages/domain/src/trip-workspace.test.ts` - tests for dashboard state from bookings/vault/readiness.
- `apps/native/src/features/trips/use-trip-id-param.ts` - validates Expo route `tripId` params before Convex calls.
- `apps/native/src/features/bookings/booking-hub-screen.tsx` - Booking Phase screen for external booking targets, built with `Container`, `Surface`, `Text`, `Button`, `Chip`, and `Spinner`.
- `apps/native/src/features/bookings/booking-target-card.tsx` - reusable booking target/status card as a thin HeroUI `Surface` composition.
- `apps/native/src/features/readiness/readiness-screen.tsx` - Preparation Readiness screen, built with `Container`, `Surface`, `Text`, `Button`, `Chip`, and `Spinner`.
- `apps/native/src/features/readiness/readiness-category-card.tsx` - readiness category summary as a HeroUI `Surface` card.
- `apps/native/src/features/readiness/readiness-item-row.tsx` - checklist row with HeroUI `Menu` or `BottomSheet` status actions.
- `apps/native/src/features/trips/trip-dashboard-screen.tsx` - real trip command center, following existing home screen `Surface` card patterns.
- `apps/native/src/features/trips/trip-itinerary-screen.tsx` - itinerary timeline from persisted days/items, using HeroUI `Surface`, `Text`, and `Chip`.
- `apps/native/src/features/vault/trip-vault-screen.tsx` - trip-specific Vault/TripSync screen, extending the existing Vault `Surface` layout.
- `apps/native/src/features/vault/tripsync-review-sheet.tsx` - HeroUI `BottomSheet` extraction review before confirming trip updates.
- `apps/native/src/features/vault/tripsync-types.ts` - UI types for pending extraction state.
- `packages/backend/convex/bookings.ts` - list/update booking targets and manual booking records.
- `packages/backend/convex/tripWorkspace.ts` - aggregate query for dashboard/itinerary/readiness/vault summaries.

Modify:

- `packages/domain/src/index.ts` - export new domain selectors.
- `packages/domain/src/types.ts` - add booking/document types only if needed by selectors; otherwise use existing schema-compatible shapes.
- `packages/domain/src/readiness.ts` - add checklist coverage helpers for Preparation Readiness.
- `packages/domain/src/readiness.test.ts` - cover required category gaps.
- `packages/backend/convex/schema.ts` - add fields needed for booking deep links and TripSync review provenance.
- `packages/backend/convex/vault.ts` - split upload metadata save from TripSync confirmation and apply extracted updates.
- `packages/backend/convex/ai/features.ts` - include pasted text/file metadata in vault extraction draft input.
- `packages/backend/convex/ai/prompts.ts` - tighten vault extraction and readiness prompts for lifecycle 1-5.
- `apps/native/src/constants/routes.ts` - replace static current-trip route helpers with functions that accept a real trip id.
- `apps/native/app/(app)/(tabs)/index.tsx` - link current trip CTAs to real trip ids.
- `apps/native/app/(app)/(tabs)/trips.tsx` - open Plan mode and real trip dashboard.
- `apps/native/app/(app)/(tabs)/vault.tsx` - keep global Vault summary, route users to a selected trip before TripSync.
- `apps/native/app/(app)/trips/[tripId]/index.tsx` - render `TripDashboardScreen`.
- `apps/native/app/(app)/trips/[tripId]/itinerary.tsx` - render `TripItineraryScreen`.
- `apps/native/app/(app)/trips/[tripId]/readiness.tsx` - render `ReadinessScreen`.
- `apps/native/app/(app)/trips/[tripId]/vault.tsx` - render `TripVaultScreen`.
- `apps/native/app/(app)/_layout.tsx` - add booking route title if a dedicated booking screen is added.
- `apps/native/src/features/vault/use-vault-upload.ts` - return a pending upload/extraction state instead of saving trip updates immediately.

## Task 1: Tighten Planning Mode Entry And Blueprint Reliability

**Files:**

- Modify: `apps/native/src/features/viya/viya-chat-screen.tsx`
- Modify: `apps/native/src/features/viya/viya-chat-utils.ts`
- Modify: `apps/native/src/features/viya/viya-chat-constants.ts`
- Modify: `apps/native/app/(app)/(tabs)/index.tsx`
- Modify: `apps/native/app/(app)/(tabs)/trips.tsx`
- Test: `apps/native/src/features/viya/viya-chat-composer.test.mts`

- [ ] **Step 1: Add tests for Trip Blueprint parsing**

Append tests that cover exact PRD sections and alias resilience:

```ts
import { extractTripBlueprint, getTripBlueprintCreateInput } from "./viya-chat-utils";

test("extracts the lifecycle Trip Blueprint sections", () => {
	const blueprint = extractTripBlueprint(`
## Trip Blueprint
### Destination
- El Nido
### Route
- Manila -> Puerto Princesa -> El Nido
### Dates
- 2026-07-10 to 2026-07-14
### Budget allocation
- PHP 25000 total
### Itinerary style
- Balanced beach trip
### Booking targets
- Book flight externally
### Requirements
- Valid ID
### Risks
- Rainy season buffer
### Next actions
- Compare flight apps
`);

	expect(blueprint?.sections.map((section) => section.id)).toEqual([
		"destination",
		"route",
		"dates",
		"budget",
		"itineraryStyle",
		"bookingTargets",
		"requirements",
		"risks",
		"nextActions",
	]);
	expect(getTripBlueprintCreateInput(blueprint!).destination).toBe("El Nido");
});
```

- [ ] **Step 2: Run the focused test**

Run: `bun test apps/native/src/features/viya/viya-chat-composer.test.mts`

Expected: fails until exports/imports and parser behavior are aligned.

- [ ] **Step 3: Export parser utilities if needed**

Ensure `extractTripBlueprint` and `getTripBlueprintCreateInput` are exported from `viya-chat-utils.ts`. They already are at plan time; keep the test import direct.

- [ ] **Step 4: Add Plan mode route intent**

Update Viya links from home and trips entry points to pass `mode=plan`:

```tsx
<Link
	asChild
	href={{
		params: { mode: "plan" },
		pathname: "/(app)/(tabs)/viya",
	}}
>
	<Button>
		<Button.Label>Plan my first trip</Button.Label>
	</Button>
</Link>
```

In `ViyaChatScreen`, read `mode` from `useLocalSearchParams()` and initialize `chatMode` to `"plan"` when the route param is exactly `"plan"`.

- [ ] **Step 5: Verify**

Run: `bun test apps/native/src/features/viya/viya-chat-composer.test.mts`

Run: `bun x ultracite check`

Expected: tests pass and no Ultracite violations.

## Task 2: Replace Placeholder Trip Routes With Real Trip Id Links

**Files:**

- Create: `apps/native/src/features/trips/use-trip-id-param.ts`
- Modify: `apps/native/src/constants/routes.ts`
- Modify: `apps/native/app/(app)/(tabs)/index.tsx`
- Modify: `apps/native/app/(app)/(tabs)/trips.tsx`
- Modify: `apps/native/src/components/trip/next-best-action-card.tsx`

- [ ] **Step 1: Create a route helper**

Create `apps/native/src/features/trips/use-trip-id-param.ts`:

```ts
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";

export const useTripIdParam = (): Id<"trips"> | null => {
	const { tripId } = useLocalSearchParams<{ tripId?: string | string[] }>();
	const value = Array.isArray(tripId) ? tripId[0] : tripId;

	return value ? (value as Id<"trips">) : null;
};
```

- [ ] **Step 2: Convert route constants to route builders**

Replace static `CURRENT_TRIP_ID` helpers with functions:

```ts
import type { Href } from "expo-router";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";

const tripRoute = (tripId: Id<"trips">, leaf = "") =>
	({
		params: { tripId },
		pathname: `/(app)/trips/[tripId]${leaf}`,
	}) as Href;

export const VIYA_ROUTES = {
	home: "/(app)/(tabs)",
	trips: "/(app)/(tabs)/trips",
	viya: "/(app)/(tabs)/viya",
	tripBookings: (tripId: Id<"trips">) => tripRoute(tripId, "/bookings"),
	tripDashboard: (tripId: Id<"trips">) => tripRoute(tripId),
	tripItinerary: (tripId: Id<"trips">) => tripRoute(tripId, "/itinerary"),
	tripMoments: (tripId: Id<"trips">) => tripRoute(tripId, "/moments"),
	tripReadiness: (tripId: Id<"trips">) => tripRoute(tripId, "/readiness"),
	tripRisks: (tripId: Id<"trips">) => tripRoute(tripId, "/risks"),
	tripTravelMode: (tripId: Id<"trips">) => tripRoute(tripId, "/travel-mode"),
	tripVault: (tripId: Id<"trips">) => tripRoute(tripId, "/vault"),
	tripWrapped: (tripId: Id<"trips">) => tripRoute(tripId, "/wrapped"),
} as const;
```

- [ ] **Step 3: Update call sites**

For every existing `VIYA_ROUTES.tripReadiness`, `tripVault`, `tripItinerary`, etc., pass the active trip id from the current query result or route param.

- [ ] **Step 4: Verify**

Run: `rg -n "VIYA_ROUTES\\.trip[A-Z][A-Za-z]+[^\\(]" apps/native/src apps/native/app`

Expected: no static trip route references remain.

Run: `bun x ultracite check`

Expected: no type/lint errors.

## Task 3: Add Booking Phase Workflow

**Files:**

- Create: `packages/domain/src/bookings.ts`
- Create: `packages/domain/src/bookings.test.ts`
- Create: `packages/backend/convex/bookings.ts`
- Create: `apps/native/src/features/bookings/booking-target-card.tsx`
- Create: `apps/native/src/features/bookings/booking-hub-screen.tsx`
- Create: `apps/native/app/(app)/trips/[tripId]/bookings.tsx`
- Modify: `packages/domain/src/index.ts`
- Modify: `packages/backend/convex/schema.ts`
- Modify: `apps/native/app/(app)/_layout.tsx`

- [ ] **Step 1: Write domain tests**

Create `packages/domain/src/bookings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getBookingProgress, groupBookingsByType } from "./bookings";

const bookings = [
	{ _id: "a", status: "target", type: "flight" },
	{ _id: "b", status: "confirmed", type: "hotel" },
	{ _id: "c", status: "target", type: "activity" },
] as const;

describe("booking selectors", () => {
	it("counts confirmed booking targets", () => {
		expect(getBookingProgress(bookings)).toEqual({
			confirmed: 1,
			remaining: 2,
			total: 3,
		});
	});

	it("groups booking targets by type", () => {
		expect(groupBookingsByType(bookings).map((group) => group.type)).toEqual([
			"flight",
			"hotel",
			"activity",
		]);
	});
});
```

- [ ] **Step 2: Implement booking selectors**

Create `packages/domain/src/bookings.ts`:

```ts
interface BookingLike {
	_id?: string;
	id?: string;
	status: string;
	type: string;
}

export const getBookingProgress = (bookings: readonly BookingLike[]) => {
	const confirmed = bookings.filter(
		(booking) => booking.status === "confirmed"
	).length;

	return {
		confirmed,
		remaining: Math.max(0, bookings.length - confirmed),
		total: bookings.length,
	};
};

export const groupBookingsByType = (bookings: readonly BookingLike[]) =>
	Object.entries(
		bookings.reduce<Record<string, BookingLike[]>>((groups, booking) => {
			const currentGroup = groups[booking.type] ?? [];
			currentGroup.push(booking);
			groups[booking.type] = currentGroup;
			return groups;
		}, {})
	).map(([type, items]) => ({ items, type }));
```

- [ ] **Step 3: Run domain tests**

Run: `bun -F @viya-app/domain test`

Expected: new booking tests fail until exports are wired, then pass.

- [ ] **Step 4: Export selectors**

Add to `packages/domain/src/index.ts`:

```ts
export * from "./bookings";
```

- [ ] **Step 5: Extend booking schema**

In `packages/backend/convex/schema.ts`, add optional fields to `bookings`:

```ts
externalUrl: v.optional(v.string()),
providerCategory: v.optional(v.string()),
```

- [ ] **Step 6: Add booking queries/mutations**

Create `packages/backend/convex/bookings.ts` with:

```ts
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";

export const listTripBookings = query({
	args: { tripId: v.id("trips") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		return ctx.db
			.query("bookings")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.collect();
	},
});

export const updateBookingStatus = mutation({
	args: {
		bookingId: v.id("bookings"),
		status: v.union(
			v.literal("target"),
			v.literal("bookedExternally"),
			v.literal("confirmed"),
			v.literal("missing"),
			v.literal("cancelled")
		),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const booking = await ctx.db.get(args.bookingId);
		if (!booking) {
			throw new ConvexError("BOOKING_NOT_FOUND");
		}
		await ensureTripAccess(ctx, booking.tripId, identity.subject);
		await ctx.db.patch(args.bookingId, {
			status: args.status,
			updatedAt: Date.now(),
		});
		return ctx.db.get(args.bookingId);
	},
});
```

- [ ] **Step 7: Build Booking Hub UI**

Create a route screen that:

- Uses `Container` for screen layout and HeroUI `Surface` cards for each section.
- Uses `Text.Heading`/`Text.Paragraph` for title and supporting copy.
- Uses HeroUI `Chip` for status/type labels.
- Uses HeroUI `Button` with `Button.Label` for status actions and Vault routing.
- Uses HeroUI `Spinner` while loading or mutating.
- Lists all target/confirmed bookings.
- Shows type, provider, confirmation code, dates, notes, and cost when available.
- Shows external booking guidance: “Book through your preferred provider. Viya does not process payments in the MVP.”
- Lets users mark a target as `bookedExternally` or `confirmed`.
- Links to TripSync/Vault to upload confirmation.
- Only creates custom `BookingTargetCard` as a repeated composition of `Surface`, `Text`, `Button`, `Chip`, and Ionicons.

- [ ] **Step 8: Verify**

Run: `bun -F @viya-app/domain test`

Run: `bun x ultracite check`

Expected: domain tests pass and route files typecheck.

## Task 4: Build Real Trip Dashboard And Itinerary Screens

**Files:**

- Create: `packages/domain/src/trip-workspace.ts`
- Create: `packages/domain/src/trip-workspace.test.ts`
- Create: `packages/backend/convex/tripWorkspace.ts`
- Create: `apps/native/src/features/trips/trip-dashboard-screen.tsx`
- Create: `apps/native/src/features/trips/trip-itinerary-screen.tsx`
- Modify: `packages/domain/src/index.ts`
- Modify: `apps/native/app/(app)/trips/[tripId]/index.tsx`
- Modify: `apps/native/app/(app)/trips/[tripId]/itinerary.tsx`

- [ ] **Step 1: Add workspace selector tests**

Create tests that prove dashboard cards are data-backed:

```ts
import { describe, expect, it } from "vitest";
import { getLifecycleStageSummary } from "./trip-workspace";

describe("trip workspace selectors", () => {
	it("marks booking as next when booking targets remain", () => {
		const summary = getLifecycleStageSummary({
			bookings: [{ status: "target" }],
			readinessScore: 0,
			vaultItems: [],
		});

		expect(summary.nextStage).toBe("book");
		expect(summary.primaryActionLabel).toBe("Review booking targets");
	});

	it("marks readiness as next after synced files exist", () => {
		const summary = getLifecycleStageSummary({
			bookings: [{ status: "confirmed" }],
			readinessScore: 72,
			vaultItems: [{ status: "ready" }],
		});

		expect(summary.nextStage).toBe("check");
		expect(summary.primaryActionLabel).toBe("Fix readiness gaps");
	});
});
```

- [ ] **Step 2: Implement selectors**

`getLifecycleStageSummary` should return:

- `nextStage: "book" | "sync" | "check" | "travel"`
- `primaryActionLabel`
- `supportingText`

Rules:

- If any booking has `status === "target"` or `status === "missing"`, next stage is `book`.
- Else if no vault items exist, next stage is `sync`.
- Else if readiness score is below 90, next stage is `check`.
- Else next stage is `travel`.

- [ ] **Step 3: Add aggregate Convex query**

Create `packages/backend/convex/tripWorkspace.ts` with `getTripWorkspace({ tripId })` returning:

- `trip`
- `bookings`
- `documents`
- `itineraryDays`
- `itineraryItems`
- `readinessItems`
- `risks`
- `vaultItems`

Reuse `ensureTripAccess` and keep storage URLs only for vault items.

- [ ] **Step 4: Build Trip Dashboard**

`TripDashboardScreen` should:

- Use `useTripIdParam()`.
- Query `api.tripWorkspace.getTripWorkspace`.
- Use `Container` and the same HeroUI `Surface` card style as `apps/native/app/(app)/(tabs)/index.tsx`.
- Use `Chip` for lifecycle stage and readiness/booking status.
- Use `Button` for the primary next action and secondary lifecycle actions.
- Reuse `EmptyState` for not-found or missing-trip states.
- Render trip title, dates, summary, lifecycle status, next action.
- Link to Booking Hub, TripSync/Vault, Readiness, Itinerary, and Trip mode chat.

- [ ] **Step 5: Build Itinerary screen**

`TripItineraryScreen` should:

- Use `itineraryDays` and `itineraryItems`.
- Group items by day.
- Use `Container`, `Surface`, `Text`, `Chip`, and `Button`; avoid raw custom cards.
- Use `EmptyState` when no itinerary items exist.
- Show time, title, category, status, booking linkage, estimated cost, and Viya reason.
- Empty state should direct users back to Viya Plan mode or Booking Hub.

- [ ] **Step 6: Verify**

Run: `bun -F @viya-app/domain test`

Run: `bun x ultracite check`

Expected: selectors pass and app references valid real trip ids.

## Task 5: Implement TripSync Review Before Saving Trip Updates

**Files:**

- Create: `apps/native/src/features/vault/tripsync-types.ts`
- Create: `apps/native/src/features/vault/tripsync-review-sheet.tsx`
- Create: `apps/native/src/features/vault/trip-vault-screen.tsx`
- Modify: `apps/native/src/features/vault/use-vault-upload.ts`
- Modify: `packages/backend/convex/vault.ts`
- Modify: `packages/backend/convex/ai/features.ts`
- Modify: `packages/backend/convex/ai/prompts.ts`
- Modify: `apps/native/app/(app)/trips/[tripId]/vault.tsx`

- [ ] **Step 1: Add TripSync UI state types**

Create `tripsync-types.ts`:

```ts
import type { VaultExtraction } from "@viya-app/domain";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";

export interface PendingTripSyncUpload {
	fileName: string;
	fileSize: number;
	kind: "booking" | "document" | "receipt" | "other";
	mimeType: string;
	storageId: Id<"_storage">;
}

export interface PendingTripSyncReview {
	extraction: VaultExtraction;
	upload: PendingTripSyncUpload;
}
```

- [ ] **Step 2: Change upload hook to return pending review**

Update `useVaultUpload.uploadFile(input)` so it:

- Uploads file to Convex storage.
- Calls `api.ai.features.extractVaultItemDraft` through `useAction`.
- Returns `{ upload, extraction }`.
- Does not call `saveVaultItem` yet.

- [ ] **Step 3: Add confirm mutation**

Add `confirmTripSyncReview` in `packages/backend/convex/vault.ts`:

- Args: `tripId`, `storageId`, file metadata, selected kind, extraction fields.
- Ensures trip access.
- Inserts `vaultItems` with `status: "ready"` and `extractedSummary`.
- If extraction has `booking`, inserts or updates a `bookings` record with `status: "confirmed"` and `extractedFrom: "tripSync"`.
- If document type is not `other`, inserts `travelDocuments` with `status: "uploaded"`.
- Inserts readiness suggestions as `readinessItems` with source `ai` when their title is not already present for the trip.
- Recalculates trip readiness score after insertion.

- [ ] **Step 4: Add review sheet UI**

`TripSyncReviewSheet` should show:

- Use HeroUI `BottomSheet`, `BottomSheet.Title`, `BottomSheet.Description`, `Surface`, `Text`, `Chip`, `Button`, and `Spinner`.
- Use compact `Surface` sections for extracted booking, document, and readiness suggestions.
- Extracted title and confidence.
- Booking details if present.
- Document type.
- Readiness suggestions.
- Primary action: `Confirm and sync`.
- Secondary action: `Discard`.

- [ ] **Step 5: Replace route Vault screen**

`TripVaultScreen` should:

- Read real `tripId` from params.
- List `api.vault.listTripVaultItems({ tripId })`.
- Use `Container`, HeroUI `Surface`, `Text`, `Button`, `Chip`, and `Spinner`, matching the existing route Vault screen.
- Reuse `VaultPreviewCard` for saved file rows unless the TripSync status requires a small HeroUI-based extension.
- Use `EmptyState` for empty saved files.
- Provide upload buttons for booking/document/receipt.
- Open `TripSyncReviewSheet` after extraction.
- Only persist trip updates after confirm.

- [ ] **Step 6: Verify**

Run: `bun x ultracite check`

Manual smoke test:

1. Create a trip from a blueprint.
2. Open trip Vault.
3. Upload a confirmation.
4. Review extraction.
5. Confirm sync.
6. Confirm new Vault item, booking/document update, and readiness item appear.

## Task 6: Implement Preparation Readiness Screen And Coverage Audit

**Files:**

- Create: `apps/native/src/features/readiness/readiness-screen.tsx`
- Create: `apps/native/src/features/readiness/readiness-category-card.tsx`
- Create: `apps/native/src/features/readiness/readiness-item-row.tsx`
- Modify: `packages/domain/src/readiness.ts`
- Modify: `packages/domain/src/readiness.test.ts`
- Modify: `packages/backend/convex/readiness.ts`
- Modify: `apps/native/app/(app)/trips/[tripId]/readiness.tsx`

- [ ] **Step 1: Extend readiness tests**

Add tests for category coverage:

```ts
it("penalizes missing required readiness categories", () => {
	const score = calculateReadinessScore([
		{
			aiReason: "Flight is confirmed.",
			assignedToMemberId: null,
			category: "bookings",
			description: "Flight confirmation uploaded.",
			dueDate: "2026-07-10",
			id: "booking-flight",
			priority: "medium",
			source: "system",
			status: "done",
			title: "Flight confirmed",
			tripId: "trip-1",
		},
	]);

	expect(score.overallScore).toBeLessThan(80);
	expect(score.categoryScores.documents).toBe(100);
});
```

- [ ] **Step 2: Add baseline audit mutation**

Add `ensureBaselineReadinessItems({ tripId })` in `packages/backend/convex/readiness.ts`:

- Create missing system items for required categories:
  - bookings
  - documents
  - budget
  - packing
  - schedule
  - safety
  - backupPlan
- Do not duplicate if a category already has at least one active item.
- Set priority based on category: bookings/documents/safety high, budget/schedule medium, packing/backupPlan low.
- Recalculate score after inserts.

- [ ] **Step 3: Build readiness screen**

`ReadinessScreen` should:

- Call `ensureBaselineReadinessItems` once when trip loads and no baseline coverage exists.
- Query `listReadinessItems`.
- Use `Container`, `Surface`, `Text`, `Button`, `Chip`, and `Spinner`.
- Use the existing `ReadinessScoreCard` if it fits the data shape; otherwise create a new score header that follows the same HeroUI `Surface` pattern.
- Render overall score, summary, category cards, and prioritized checklist.
- Allow status transitions: `todo`, `inProgress`, `done`, `blocked`, `ignored`.
- Recalculate score after each status update.

- [ ] **Step 4: Add category cards**

Each `ReadinessCategoryCard` should show:

- Be a HeroUI `Surface` composition, not a raw custom card.
- Category label from `READINESS_CATEGORY_LABELS`.
- Score from `calculateReadinessScore`.
- Count of open items.
- Highest priority in that category.

- [ ] **Step 5: Verify**

Run: `bun -F @viya-app/domain test`

Run: `bun x ultracite check`

Manual smoke test:

1. Open Readiness from a new blueprint trip.
2. Confirm baseline categories exist.
3. Mark one high-priority item done.
4. Confirm score recalculates and persists on the trip.

## Task 7: Wire Lifecycle CTA Flow Across Screens

**Files:**

- Modify: `apps/native/src/features/trips/trip-dashboard-screen.tsx`
- Modify: `apps/native/src/features/bookings/booking-hub-screen.tsx`
- Modify: `apps/native/src/features/vault/trip-vault-screen.tsx`
- Modify: `apps/native/src/features/readiness/readiness-screen.tsx`
- Modify: `apps/native/app/(app)/(tabs)/index.tsx`

- [ ] **Step 1: Add consistent lifecycle labels**

Use the same visible lifecycle names:

- Plan
- Book
- Sync
- Check

Do not add Travel/Track/Capture/Share in this implementation except as disabled “next later” indicators if needed.

- [ ] **Step 2: Dashboard CTA routing**

Primary CTA rules:

- `book`: open Booking Hub.
- `sync`: open TripSync/Vault.
- `check`: open Readiness.
- `travel`: open Travel Mode.

- [ ] **Step 3: Booking Hub CTA routing**

Each booking target should offer:

- `Open provider` when `externalUrl` exists.
- `Mark booked externally`.
- `Upload confirmation` route to trip Vault.

- [ ] **Step 4: TripSync CTA routing**

After confirmed sync:

- Show “Review readiness impact”.
- Route to Readiness screen with the same `tripId`.

- [ ] **Step 5: Readiness CTA routing**

When readiness score is below 90:

- CTA routes to the highest-priority open item category.

When readiness score is 90 or above:

- CTA routes to Travel Mode.

- [ ] **Step 6: Verify**

Run: `bun x ultracite check`

Manual smoke test full lifecycle:

1. Start Plan mode from Home.
2. Generate Trip Blueprint.
3. Create trip.
4. Open trip dashboard.
5. Review Booking Hub targets.
6. Upload/sync confirmation in Vault.
7. Confirm Readiness updates.

## Task 8: Final Verification

**Files:**

- No new files unless previous tasks require fixes.

- [ ] **Step 1: Run domain tests**

Run: `bun -F @viya-app/domain test`

Expected: all Vitest domain tests pass.

- [ ] **Step 2: Run native focused tests**

Run: `bun test apps/native/src/features/viya/viya-chat-composer.test.mts`

Expected: chat/blueprint utility tests pass.

- [ ] **Step 3: Run type/lint check**

Run: `bun x ultracite check`

Expected: no Ultracite errors.

- [ ] **Step 4: Run Expo web smoke test**

Run: `bun run dev:native -- --web`

Expected: Expo starts. In the browser, verify Home -> Viya Plan -> Trip Blueprint -> Create Trip -> Dashboard -> Booking -> Vault/TripSync -> Readiness.

## Execution Order

1. Task 1 and Task 2 first because all downstream screens depend on reliable plan entry and real trip id routing.
2. Task 3 next because Trip Agreement already creates booking targets and the missing Booking Phase is the clearest gap.
3. Task 4 after Booking Hub so dashboard CTAs can point to real lifecycle surfaces.
4. Task 5 after dashboard and booking because TripSync updates bookings/documents/readiness.
5. Task 6 after TripSync so readiness can reflect synced state.
6. Task 7 last to polish the full lifecycle CTA flow.
7. Task 8 before calling the implementation complete.

## Scope Boundaries

In scope:

- Lifecycle steps 1-5 only.
- External booking targets and manual status changes.
- File upload TripSync with extraction review.
- Trip-specific Vault items.
- Booking/document/readiness updates after confirmation.
- Readiness category coverage and score display.

Out of scope for this plan:

- Payment processing.
- Real provider booking API integration.
- Live travel alerts, weather, traffic, or official immigration/compliance checks.
- Budget Tracking, Memory Capture, Trip Story, and Community Template beyond existing teasers.
- OCR for image/PDF content unless already available through the selected AI provider. Metadata and pasted text extraction are acceptable for this MVP phase.

## Self-Review

- Spec coverage: Steps 1-5 from the PRD are covered by Tasks 1-7.
- Placeholder scan: No task depends on unspecified files or unnamed “later” work.
- Type consistency: The plan uses existing `Id<"trips">`, `VaultExtraction`, booking/readiness statuses, and route patterns already present in the app.
- Main risk: Convex action-to-mutation flow for TripSync may need generated API refresh after adding `bookings.ts` and `tripWorkspace.ts`.
