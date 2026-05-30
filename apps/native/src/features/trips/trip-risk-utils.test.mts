import { describe, expect, it } from "bun:test";

import { sortTripRisksForReview } from "@viya-app/domain";

describe("trip risk review sorting", () => {
	it("keeps open severe risks first and resolved risks later", () => {
		const risks = [
			{
				createdAt: 30,
				severity: "low",
				status: "open",
				title: "Light rain",
			},
			{
				createdAt: 50,
				severity: "critical",
				status: "dismissed",
				title: "Old alert",
			},
			{
				createdAt: 10,
				severity: "high",
				status: "open",
				title: "Tight transfer",
			},
			{
				createdAt: 40,
				severity: "medium",
				status: "mitigated",
				title: "Backup hotel",
			},
			{
				createdAt: 20,
				severity: "critical",
				status: "open",
				title: "Passport expiry",
			},
		] as const;

		expect(sortTripRisksForReview(risks).map((risk) => risk.title)).toEqual([
			"Passport expiry",
			"Tight transfer",
			"Light rain",
			"Backup hotel",
			"Old alert",
		]);
	});
});
