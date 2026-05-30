import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const rootPath = resolve(import.meta.dirname, "../../..");
const dayOrderMapPattern =
	/new Map\(\s*itineraryDays\.map\(\(day\) => \[day\._id, day\.dayNumber\]\)\s*\)/;
const savedPlacesSortPattern =
	/sortedSavedPlaces\s*=\s*sortTripPlacesForRouteReview\(\s*savedPlaces,\s*dayOrderById\s*\)/;
const itineraryPlacesSortPattern =
	/sortedItineraryPlaces\s*=\s*sortTripPlacesForRouteReview\(\s*itineraryPlaces,\s*dayOrderById\s*\)/;
const workspaceSavedPlacesSortPattern =
	/sortedSavedPlaces\s*=\s*sortTripPlacesForRouteReview\(\s*savedPlaces,\s*dayOrderById\s*\)/;
const workspaceReturnsSortedSavedPlacesPattern =
	/savedPlaces:\s*sortedSavedPlaces/;

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip places contract", () => {
	it("orders saved and itinerary places for route review", () => {
		const placesSource = readWorkspaceFile("packages/backend/convex/places.ts");
		const workspaceSource = readWorkspaceFile(
			"packages/backend/convex/tripWorkspace.ts"
		);

		assert.match(
			placesSource,
			dayOrderMapPattern,
			"listTripPlaces should build itinerary day order for route sorting"
		);
		assert.match(
			placesSource,
			savedPlacesSortPattern,
			"listTripPlaces should sort saved places for route review"
		);
		assert.match(
			placesSource,
			itineraryPlacesSortPattern,
			"listTripPlaces should sort itinerary stops for route review"
		);
		assert.match(
			workspaceSource,
			workspaceSavedPlacesSortPattern,
			"getTripWorkspace should sort saved places for dashboard previews"
		);
		assert.match(
			workspaceSource,
			workspaceReturnsSortedSavedPlacesPattern,
			"getTripWorkspace should return sorted saved places"
		);
	});
});
