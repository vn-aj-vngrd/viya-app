import { describe, expect, it } from "vitest";

import {
	findDuplicateItineraryDay,
	findNextFreeSlot,
	getItineraryCategoryForBooking,
	getItineraryCategoryForPlace,
	isDateWithinTripRange,
	validateItineraryTiming,
} from "./itinerary-validation";

describe("validateItineraryTiming", () => {
	it("normalises times and derives duration", () => {
		expect(
			validateItineraryTiming({ endTime: "10:30", startTime: "9:00" })
		).toEqual({
			durationMinutes: 90,
			endTime: "10:30",
			ok: true,
			startTime: "09:00",
		});
	});

	it("rejects invalid times", () => {
		expect(
			validateItineraryTiming({ endTime: "10:00", startTime: "25:00" })
		).toEqual({ error: "INVALID_START_TIME", ok: false });
		expect(
			validateItineraryTiming({ endTime: "soon", startTime: "09:00" })
		).toEqual({ error: "INVALID_END_TIME", ok: false });
	});

	it("rejects an end before the start unless overnight", () => {
		expect(
			validateItineraryTiming({ endTime: "01:00", startTime: "22:00" })
		).toEqual({ error: "END_BEFORE_START", ok: false });
		expect(
			validateItineraryTiming({
				endTime: "01:00",
				overnight: true,
				startTime: "22:00",
			})
		).toMatchObject({ durationMinutes: 180, ok: true });
	});
});

describe("itinerary dates", () => {
	it("checks the inclusive trip range", () => {
		expect(
			isDateWithinTripRange("2026-11-21", "2026-11-21", "2026-11-25")
		).toBe(true);
		expect(
			isDateWithinTripRange("2026-11-25", "2026-11-21", "2026-11-25")
		).toBe(true);
		expect(
			isDateWithinTripRange("2026-11-26", "2026-11-21", "2026-11-25")
		).toBe(false);
		expect(isDateWithinTripRange("nope", "2026-11-21", "2026-11-25")).toBe(
			false
		);
	});

	it("finds duplicate day numbers and dates, ignoring the day itself", () => {
		const existing = [
			{ date: "2026-11-21", dayNumber: 1, id: "a" },
			{ date: "2026-11-22", dayNumber: 2, id: "b" },
		];

		expect(
			findDuplicateItineraryDay({ date: "2026-11-23", dayNumber: 2 }, existing)
		).toBe("dayNumber");
		expect(
			findDuplicateItineraryDay({ date: "2026-11-22", dayNumber: 3 }, existing)
		).toBe("date");
		expect(
			findDuplicateItineraryDay(
				{ date: "2026-11-22", dayNumber: 2, id: "b" },
				existing
			)
		).toBeNull();
	});
});

describe("findNextFreeSlot", () => {
	it("starts at 09:00 on an empty day", () => {
		expect(findNextFreeSlot([])).toEqual({
			endTime: "10:00",
			startTime: "09:00",
		});
	});

	it("moves past overlapping stops", () => {
		expect(
			findNextFreeSlot([
				{ endTime: "10:30", startTime: "09:00" },
				{ endTime: "12:00", startTime: "10:30" },
			])
		).toEqual({ endTime: "13:00", startTime: "12:00" });
	});

	it("keeps a gap that fits", () => {
		expect(
			findNextFreeSlot([{ endTime: "08:00", startTime: "07:00" }])
		).toEqual({ endTime: "10:00", startTime: "09:00" });
	});
});

describe("item categories", () => {
	it("maps booking types and place categories", () => {
		expect(getItineraryCategoryForBooking("restaurant")).toBe("food");
		expect(getItineraryCategoryForBooking("insurance")).toBe("note");
		expect(getItineraryCategoryForPlace("food")).toBe("food");
		expect(getItineraryCategoryForPlace("beach")).toBe("activity");
	});
});
