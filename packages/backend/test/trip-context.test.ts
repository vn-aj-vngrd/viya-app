import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	buildTripContextJson,
	type TripContextSource,
} from "../src/ai/trip-context";

const emptySource = (): TripContextSource => ({
	bookings: [],
	companions: [],
	expenses: [],
	itineraryDays: [],
	itineraryItems: [],
	notes: [],
	readinessItems: [],
	risks: [],
	savedPlaces: [],
	trip: { destination: "Cebu", title: "Cebu trip" },
	vaultItems: [],
});

const sardinesPattern = /Sardines/;
const cashPattern = /Bring cash/;
const anaPattern = /Ana/;
const contactPattern = /a@b\.co|0917/;

describe("trip context", () => {
	it("includes places, notes and companion names but not contact details", () => {
		const json = buildTripContextJson({
			...emptySource(),
			companions: [
				{ email: "a@b.co", name: "Ana", phone: "0917", role: "friend" },
			],
			notes: [{ body: "Bring cash", title: "Tips" }],
			savedPlaces: [{ locationName: "Moalboal", title: "Sardines" }],
		});

		assert.match(json, sardinesPattern);
		assert.match(json, cashPattern);
		assert.match(json, anaPattern);
		assert.doesNotMatch(json, contactPattern);
	});

	it("trims lists to stay within the size budget", () => {
		const json = buildTripContextJson(
			{
				...emptySource(),
				itineraryItems: Array.from({ length: 200 }, (_, index) => ({
					locationName: "x".repeat(150),
					title: `Stop ${index} ${"y".repeat(150)}`,
				})),
			},
			5000
		);

		assert.ok(json.length <= 5000);
	});
});
