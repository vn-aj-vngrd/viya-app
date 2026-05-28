import { describe, expect, it } from "vitest";

import { getBookingProgress, groupBookingsByType } from "./bookings";

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
