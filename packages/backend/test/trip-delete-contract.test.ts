import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const rootPath = resolve(import.meta.dirname, "../../..");
const requiredDeletedTripCollections = [
	"bookings",
	"travelDocuments",
	"expenses",
	"itineraryDays",
	"itineraryItems",
	"moments",
	"readinessItems",
	"risks",
	"tripNotes",
	"tripCompanions",
	"savedPlaces",
	"tripAgentDrafts",
] as const;
const requiredDeletedDraftStatuses = ["draft", "applied", "dismissed"] as const;
const chatDemotionPattern = /mode: "chat"/;
const chatPromptCollectionPattern = /query\("chatQuestionPrompts"\)/;
const chatPromptDismissalPattern = /status: "dismissed"/;

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip deletion contract", () => {
	it("deletes every trip-owned workspace collection", () => {
		const tripsSource = readWorkspaceFile("packages/backend/convex/trips.ts");
		const deleteTripSource = tripsSource.slice(
			tripsSource.indexOf("export const deleteTrip")
		);

		for (const collection of requiredDeletedTripCollections) {
			assert.match(
				deleteTripSource,
				new RegExp(`query\\("${collection}"\\)`),
				`deleteTrip should collect ${collection}`
			);
		}

		for (const status of requiredDeletedDraftStatuses) {
			assert.match(
				deleteTripSource,
				new RegExp(`eq\\("status", "${status}"\\)`),
				`deleteTrip should collect ${status} tripAgentDrafts`
			);
		}
	});

	it("demotes linked trip chat threads and dismisses pending trip prompts", () => {
		const tripsSource = readWorkspaceFile("packages/backend/convex/trips.ts");
		const deleteTripSource = tripsSource.slice(
			tripsSource.indexOf("export const deleteTrip")
		);

		assert.match(
			deleteTripSource,
			chatDemotionPattern,
			"deleteTrip should demote linked trip chat threads to general chat"
		);
		assert.match(
			deleteTripSource,
			chatPromptCollectionPattern,
			"deleteTrip should collect pending chat prompts for linked trip threads"
		);
		assert.match(
			deleteTripSource,
			chatPromptDismissalPattern,
			"deleteTrip should dismiss pending trip prompts for linked chat threads"
		);
	});
});
