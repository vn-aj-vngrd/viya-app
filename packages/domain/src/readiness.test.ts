import { describe, expect, it } from "vitest";
import { palawanDemoTrip } from "./demo/palawan";
import {
	calculateReadinessScore,
	sortReadinessItemsForReview,
} from "./readiness";
import type { ReadinessItem } from "./types";

describe("calculateReadinessScore", () => {
	it("keeps trips without readiness items unchecked", () => {
		const score = calculateReadinessScore([]);

		expect(score.overallScore).toBe(0);
		expect(score.categoryScores.bookings).toBe(0);
		expect(score.summary).toBe("Readiness has not been checked yet.");
	});

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

	it("orders readiness items by action urgency", () => {
		const baseItem = {
			aiReason: "Keep this visible in prep.",
			assignedToMemberId: null,
			category: "documents",
			description: "Prepare before departure.",
			dueDate: "2026-07-20",
			id: "base",
			priority: "medium",
			source: "system",
			status: "todo",
			title: "Base item",
			tripId: "trip-1",
		} satisfies ReadinessItem;
		const sortedItems = sortReadinessItemsForReview([
			{
				...baseItem,
				dueDate: "2026-07-05",
				id: "done",
				priority: "critical",
				status: "done",
				title: "Completed visa check",
			},
			{
				...baseItem,
				id: "todo-high-later",
				priority: "high",
				title: "Confirm backup plan",
			},
			{
				...baseItem,
				dueDate: "2026-07-01",
				id: "blocked-medium",
				priority: "medium",
				status: "blocked",
				title: "Upload passport copy",
			},
			{
				...baseItem,
				dueDate: "2026-07-10",
				id: "in-progress-critical",
				priority: "critical",
				status: "inProgress",
				title: "Finalize travel insurance",
			},
		]);

		expect(sortedItems.map((item) => item.id)).toEqual([
			"blocked-medium",
			"in-progress-critical",
			"todo-high-later",
			"done",
		]);
	});
});
