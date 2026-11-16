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

	const TODAY = "2026-06-01";
	const baseItem = {
		aiReason: "",
		assignedToMemberId: null,
		category: "documents",
		description: "",
		dueDate: "2026-07-10",
		id: "i",
		priority: "medium",
		source: "system",
		status: "todo",
		title: "Item",
		tripId: "trip-1",
	} satisfies ReadinessItem;

	it("scores the seeded Palawan readiness below the ready threshold", () => {
		const score = calculateReadinessScore(
			palawanDemoTrip.readinessItems,
			TODAY
		);

		// done 2 of (3 + 4*1.5 blocked + 3 + 2) weight
		expect(score.overallScore).toBe(14);
		expect(score.categoryScores.transport).toBeLessThan(100);
		expect(score.categoryScores.bookings).toBeLessThan(80);
		expect(score.summary).toBe(
			"14% ready. Fix 3 high-priority gaps before departure."
		);
	});

	it("raises the score when high-priority gaps are completed", () => {
		const fixedItems = palawanDemoTrip.readinessItems.map((item) =>
			item.priority === "high" || item.priority === "critical"
				? { ...item, status: "done" as const }
				: item
		);

		expect(calculateReadinessScore(fixedItems, TODAY).overallScore).toBe(100);
	});

	it("lets a trip reach 100 when every item is done or ignored", () => {
		const score = calculateReadinessScore(
			[
				{ ...baseItem, id: "a", status: "done" },
				{ ...baseItem, id: "b", category: "bookings", status: "ignored" },
			],
			TODAY
		);

		expect(score.overallScore).toBe(100);
		expect(score.summary).toBe("100% ready. Everything is done.");
	});

	it("does not penalise categories without items", () => {
		const score = calculateReadinessScore(
			[{ ...baseItem, category: "bookings", status: "done" }],
			TODAY
		);

		expect(score.overallScore).toBe(100);
		expect(score.categoryScores.documents).toBe(100);
	});

	it("weighs overdue and blocked work harder than plain todo", () => {
		const done = {
			...baseItem,
			id: "d",
			priority: "high",
			status: "done",
		} as const;
		const todo = calculateReadinessScore(
			[done, { ...baseItem, id: "t", priority: "high" }],
			TODAY
		);
		const overdue = calculateReadinessScore(
			[done, { ...baseItem, id: "t", priority: "high", dueDate: "2026-05-01" }],
			TODAY
		);
		const blocked = calculateReadinessScore(
			[done, { ...baseItem, id: "t", priority: "high", status: "blocked" }],
			TODAY
		);

		expect(todo.overallScore).toBe(50);
		expect(overdue.overallScore).toBeLessThan(todo.overallScore);
		expect(blocked.overallScore).toBe(overdue.overallScore);
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
