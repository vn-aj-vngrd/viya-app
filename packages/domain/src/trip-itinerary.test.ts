import { describe, expect, it } from "vitest";

import { sortTripItineraryItemsForTimeline } from "./trip-itinerary";

describe("trip itinerary selectors", () => {
	it("orders itinerary items by day order, time, and title", () => {
		const dayOrderById = new Map([
			["day-1", 1],
			["day-2", 2],
		]);
		const items = [
			{
				_id: "late-day-one",
				dayId: "day-1",
				startTime: "17:00",
				title: "Dinner",
			},
			{
				_id: "early-day-two",
				dayId: "day-2",
				startTime: "08:00",
				title: "Ferry",
			},
			{
				_id: "early-day-one",
				dayId: "day-1",
				startTime: "09:00",
				title: "Museum",
			},
			{
				_id: "unknown-day",
				dayId: "day-3",
				startTime: "07:00",
				title: "Needs day",
			},
		] as const;

		expect(
			sortTripItineraryItemsForTimeline(items, dayOrderById).map(
				(item) => item._id
			)
		).toEqual([
			"early-day-one",
			"late-day-one",
			"early-day-two",
			"unknown-day",
		]);
		expect(items.map((item) => item._id)).toEqual([
			"late-day-one",
			"early-day-two",
			"early-day-one",
			"unknown-day",
		]);
	});
});
