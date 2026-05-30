import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const rootPath = resolve(import.meta.dirname, "../../..");
const bookingValidatorPattern =
	/throw new ConvexError\("BOOKING_TRIP_MISMATCH"\)/;
const createBookingPatchPattern =
	/\.\.\.\(await getItineraryBookingPatch\(ctx, bookingId, args\.tripId\)\)/;
const explicitUpdatePattern =
	/const shouldUpdateBooking = hasOwnObjectProperty\(args, "bookingId"\)/;
const clearBookingPattern = /return \{ bookingId: undefined \}/;
const itinerarySortImportPattern =
	/import \{[\s\S]*sortTripItineraryItemsForTimeline[\s\S]*\} from "@viya-app\/domain";/;
const listItinerarySortPattern =
	/items: sortTripItineraryItemsForTimeline\(\s*items,\s*dayOrderById\s*\),/;
const workspaceItinerarySortPattern =
	/const sortedItineraryItems = sortTripItineraryItemsForTimeline\(\s*itineraryItems,\s*dayOrderById\s*\);/;

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip itinerary contract", () => {
	it("validates and normalizes booking links on itinerary items", () => {
		const source = readWorkspaceFile("packages/backend/convex/itinerary.ts");

		assert.match(
			source,
			bookingValidatorPattern,
			"itinerary booking links should be validated against the trip"
		);
		assert.match(
			source,
			createBookingPatchPattern,
			"createItineraryItem should normalize booking links before insert"
		);
		assert.match(
			source,
			explicitUpdatePattern,
			"updateItineraryItem should distinguish omitted booking links from clear requests"
		);
		assert.match(
			source,
			clearBookingPattern,
			"empty itinerary booking links should clear the stored field"
		);
	});

	it("returns itinerary items in timeline order", () => {
		const itinerarySource = readWorkspaceFile(
			"packages/backend/convex/itinerary.ts"
		);
		const workspaceSource = readWorkspaceFile(
			"packages/backend/convex/tripWorkspace.ts"
		);

		assert.match(
			itinerarySource,
			itinerarySortImportPattern,
			"listTripItinerary should import the shared timeline sorter"
		);
		assert.match(
			itinerarySource,
			listItinerarySortPattern,
			"listTripItinerary should sort items by day order before returning them"
		);
		assert.match(
			workspaceSource,
			itinerarySortImportPattern,
			"trip workspace should import the shared timeline sorter"
		);
		assert.match(
			workspaceSource,
			workspaceItinerarySortPattern,
			"trip workspace should sort items by day order before returning them"
		);
	});
});
