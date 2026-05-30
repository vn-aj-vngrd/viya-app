import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const rootPath = resolve(import.meta.dirname, "../../..");
const dayValidationHelperPattern = /const ensureDayBelongsToTrip = async \(/;
const createMomentDayValidationPattern =
	/createMoment[\s\S]*await ensureDayBelongsToTrip\(ctx, args\.dayId, args\.tripId\)/;
const updateMomentDayValidationPattern =
	/updateMoment[\s\S]*await ensureDayBelongsToTrip\(ctx, args\.dayId, moment\.tripId\)/;
const deleteDayMomentsCleanupPattern =
	/deleteItineraryDay[\s\S]*query\("moments"\)[\s\S]*dayId: undefined/;

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip moments contract", () => {
	it("keeps moment day links scoped to existing itinerary days", () => {
		const momentsSource = readWorkspaceFile(
			"packages/backend/convex/moments.ts"
		);
		const itinerarySource = readWorkspaceFile(
			"packages/backend/convex/itinerary.ts"
		);

		assert.match(
			momentsSource,
			dayValidationHelperPattern,
			"moments should validate day links against itinerary days"
		);
		assert.match(
			momentsSource,
			createMomentDayValidationPattern,
			"createMoment should reject day links from another trip"
		);
		assert.match(
			momentsSource,
			updateMomentDayValidationPattern,
			"updateMoment should reject day links from another trip"
		);
		assert.match(
			itinerarySource,
			deleteDayMomentsCleanupPattern,
			"deleting an itinerary day should clear moment day links"
		);
	});
});
