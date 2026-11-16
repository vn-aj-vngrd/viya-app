import { describe, expect, it } from "vitest";

import {
	getBookingInputError,
	getBookingProgress,
	groupBookingsByType,
	isBookingEndBeforeStart,
} from "./bookings";

const bookings = [
	{ _id: "a", status: "target", type: "flight" },
	{ _id: "b", status: "confirmed", type: "hotel" },
	{ _id: "c", status: "target", type: "activity" },
] as const;

describe("booking selectors", () => {
	it("counts confirmed booking targets", () => {
		expect(getBookingProgress(bookings)).toEqual({
			confirmed: 1,
			remaining: 2,
			total: 3,
		});
	});

	it("groups booking targets by type", () => {
		expect(groupBookingsByType(bookings).map((group) => group.type)).toEqual([
			"flight",
			"hotel",
			"activity",
		]);
	});
});

describe("booking end check", () => {
	it("accepts a same-day end date without a time", () => {
		expect(isBookingEndBeforeStart("2026-05-01 14:00", "2026-05-01")).toBe(
			false
		);
	});

	it("rejects an end date before the start date", () => {
		expect(isBookingEndBeforeStart("2026-05-02", "2026-05-01")).toBe(true);
		expect(
			isBookingEndBeforeStart("2026-05-01 14:00", "2026-05-01 09:00")
		).toBe(true);
	});

	it("handles a T separator", () => {
		expect(
			isBookingEndBeforeStart("2026-05-01T09:00", "2026-05-01 10:00")
		).toBe(false);
	});

	it("reports the error through getBookingInputError", () => {
		expect(
			getBookingInputError({
				endDateTime: "2026-05-01",
				startDateTime: "2026-05-01 14:00",
				title: "Hotel",
			})
		).toBeNull();
	});
});
