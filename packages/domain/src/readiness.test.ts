import { describe, expect, it } from "vitest";

import { palawanDemoTrip } from "./demo/palawan";
import { calculateReadinessScore } from "./readiness";

describe("calculateReadinessScore", () => {
	it("returns the seeded Palawan readiness score before fixes", () => {
		const score = calculateReadinessScore(palawanDemoTrip.readinessItems);

		expect(score.overallScore).toBe(68);
		expect(score.categoryScores.transport).toBeLessThan(100);
		expect(score.categoryScores.bookings).toBeLessThan(80);
		expect(score.summary).toBe(
			"68% ready. Fix 3 high-priority gaps before departure."
		);
	});

	it("raises the score when high-priority gaps are completed", () => {
		const fixedItems = palawanDemoTrip.readinessItems.map((item) =>
			item.priority === "high" || item.priority === "critical"
				? { ...item, status: "done" as const }
				: item
		);

		const score = calculateReadinessScore(fixedItems);

		expect(score.overallScore).toBe(84);
		expect(score.summary).toBe("84% ready. Core travel risks are reduced.");
	});

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
});
