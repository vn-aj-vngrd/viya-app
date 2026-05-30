import { describe, expect, it } from "bun:test";

import { buildTripRecapShareMessage } from "./trip-recap-share";

describe("trip recap share message", () => {
	it("builds a concise shareable trip story from recap metrics", () => {
		expect(
			buildTripRecapShareMessage({
				completedItems: 5,
				confirmedBookings: 3,
				currency: "PHP",
				dateWindow: "10 Jul - 14 Jul",
				destination: "Tokyo",
				highlightTitles: ["Tsukiji breakfast", "Ghibli Museum"],
				remainingAmount: 4200,
				savedDocumentCount: 4,
				title: "Japan summer",
				totalItems: 6,
				totalTrackedSpend: 52_000,
			})
		).toBe(
			"Japan summer\nTokyo · 10 Jul - 14 Jul\n\nHighlights: Tsukiji breakfast, Ghibli Museum\nItinerary: 5/6 completed\nSpend tracked: PHP 52,000 · PHP 4,200 remaining\nBookings and files: 3 confirmed · 4 saved\n\nPlanned with Viya."
		);
	});

	it("falls back gracefully when there are no highlights yet", () => {
		expect(
			buildTripRecapShareMessage({
				completedItems: 0,
				confirmedBookings: 0,
				currency: "PHP",
				dateWindow: "Dates TBD",
				destination: "Palawan",
				highlightTitles: [],
				remainingAmount: 0,
				savedDocumentCount: 0,
				title: "Island trip",
				totalItems: 0,
				totalTrackedSpend: 0,
			})
		).toContain("Highlights: Add moments to complete the trip story");
	});
});
