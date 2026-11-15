import { describe, expect, it } from "bun:test";

import { buildTripRecapShareMessage } from "./trip-recap-share";

describe("trip recap share message", () => {
	it("builds a concise shareable trip story from recap metrics", () => {
		expect(
			buildTripRecapShareMessage({
				budgetOutcome: "Spent: ₱52,000 of ₱56,200",
				completedItems: 5,
				confirmedBookings: 3,
				dateWindow: "10–14 Jul 2026",
				destination: "Tokyo",
				fileCount: 4,
				highlightTitles: ["Tsukiji breakfast", "Ghibli Museum"],
				title: "Japan summer",
				totalBookings: 4,
				totalItems: 6,
			})
		).toBe(
			"Japan summer\nTokyo · 10–14 Jul 2026\n\nHighlights: Tsukiji breakfast, Ghibli Museum\nStops: 5 of 6 done\nSpent: ₱52,000 of ₱56,200\nBookings: 3 of 4 booked · 4 files"
		);
	});

	it("omits the highlights line when there are none", () => {
		const message = buildTripRecapShareMessage({
			budgetOutcome: "Spent: ₱0",
			completedItems: 0,
			confirmedBookings: 0,
			dateWindow: "",
			destination: "Palawan",
			fileCount: 1,
			highlightTitles: [],
			title: "Island trip",
			totalBookings: 0,
			totalItems: 0,
		});

		expect(message).not.toContain("Highlights");
		expect(message).not.toContain("Planned with Viya");
		expect(message).toContain("Palawan\n");
	});
});
