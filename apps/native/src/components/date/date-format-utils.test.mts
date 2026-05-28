import { describe, expect, test } from "bun:test";

import {
	formatReadableDate,
	formatReadableTripDateRange,
	getDateRangeDurationDays,
} from "./date-format-utils";

describe("formatReadableDate", () => {
	test("formats timestamps as readable dates", () => {
		expect(formatReadableDate(Date.UTC(2026, 4, 12))).toBe("May 12, 2026");
	});

	test("formats ISO date times as readable dates", () => {
		expect(formatReadableDate("2026-05-12T18:30:00.000Z")).toBe("May 12, 2026");
	});
});

describe("formatReadableTripDateRange", () => {
	test("formats same-month trip ranges compactly", () => {
		expect(
			formatReadableTripDateRange({
				endDate: "2026-05-14",
				startDate: "2026-05-12",
			})
		).toBe("May 12 - 14");
	});

	test("formats cross-month trip ranges compactly", () => {
		expect(
			formatReadableTripDateRange({
				endDate: "2026-06-02",
				startDate: "2026-05-28",
			})
		).toBe("May 28 - Jun 2");
	});

	test("keeps years when a range crosses years", () => {
		expect(
			formatReadableTripDateRange({
				endDate: "2027-01-02",
				startDate: "2026-12-30",
			})
		).toBe("Dec 30, 2026 - Jan 2, 2027");
	});

	test("uses fallback label for missing dates", () => {
		expect(
			formatReadableTripDateRange({
				endDate: "",
				fallbackLabel: "Dates not set",
				startDate: "",
			})
		).toBe("Dates not set");
	});

	test("uses fallback label for invalid dates", () => {
		expect(
			formatReadableTripDateRange({
				endDate: "2026-02-30",
				fallbackLabel: "Dates not set",
				startDate: "2026-13-12",
			})
		).toBe("Dates not set");
	});
});

describe("getDateRangeDurationDays", () => {
	test("counts trip days inclusively", () => {
		expect(getDateRangeDurationDays("2026-05-12", "2026-05-14")).toBe(3);
	});
});
