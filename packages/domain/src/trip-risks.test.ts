import { describe, expect, it } from "vitest";

import { sortTripRisksForReview } from "./trip-risks";

describe("trip risk ordering", () => {
	it("prioritizes open severe risks before resolved and lower severity risks", () => {
		const risks = [
			{
				createdAt: 30,
				severity: "medium",
				status: "open",
				title: "Dinner delay",
			},
			{
				createdAt: 60,
				severity: "critical",
				status: "dismissed",
				title: "Old passport alert",
			},
			{
				createdAt: 20,
				severity: "critical",
				status: "open",
				title: "Passport expiry",
			},
			{
				createdAt: 50,
				severity: "high",
				status: "mitigated",
				title: "Backup transfer",
			},
			{
				createdAt: 40,
				severity: "high",
				status: "open",
				title: "Tight transfer",
			},
		] as const;

		expect(sortTripRisksForReview(risks).map((risk) => risk.title)).toEqual([
			"Passport expiry",
			"Tight transfer",
			"Dinner delay",
			"Backup transfer",
			"Old passport alert",
		]);
	});
});
