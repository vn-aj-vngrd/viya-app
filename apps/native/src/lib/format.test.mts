import { describe, expect, it } from "bun:test";

import {
	formatCount,
	formatDay,
	formatDuration,
	formatEnumLabel,
	formatFileSize,
	formatMoney,
	formatRelativeDay,
	formatShortDate,
	formatTime,
	formatTimeRange,
	formatTripCountdown,
	formatTripRange,
	getMinutesBetween,
	toLocalDateKey,
	toLocalTimeKey,
} from "./format";

const year = new Date().getFullYear();
const nextYear = year + 1;

describe("formatMoney", () => {
	it("formats pesos without decimals", () => {
		expect(formatMoney(12_500)).toBe("₱12,500");
		expect(formatMoney(0)).toBe("₱0");
		expect(formatMoney(undefined)).toBe("₱0");
		expect(formatMoney(Number.NaN)).toBe("₱0");
		expect(formatMoney(-500)).toBe("-₱500");
		expect(formatMoney(120, "USD")).toBe("US$120");
	});
});

describe("formatCount", () => {
	it("pluralises", () => {
		expect(formatCount(1, "stop")).toBe("1 stop");
		expect(formatCount(3, "stop")).toBe("3 stops");
		expect(formatCount(0, "file")).toBe("0 files");
		expect(formatCount(2, "person", "people")).toBe("2 people");
	});
});

describe("local keys", () => {
	it("uses local calendar parts", () => {
		const date = new Date(2026, 10, 5, 8, 40);
		expect(toLocalDateKey(date)).toBe("2026-11-05");
		expect(toLocalTimeKey(date)).toBe("08:40");
	});
});

describe("dates", () => {
	it("formats day and short date", () => {
		expect(formatDay(`${year}-11-21`, { year: "always" })).toBe(
			`${new Date(Date.UTC(year, 10, 21)).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short" })} 21 Nov ${year}`
		);
		expect(formatShortDate(`${year}-11-21`)).toBe("21 Nov");
		expect(formatShortDate(`${nextYear}-11-21`)).toBe(`21 Nov ${nextYear}`);
		expect(formatDay("2026-11-21", { year: "always" })).toBe("Sat 21 Nov 2026");
		expect(formatDay("bad")).toBe("");
	});

	it("formats trip ranges", () => {
		expect(formatTripRange(`${year}-11-21`, `${year}-11-25`)).toBe("21–25 Nov");
		expect(formatTripRange(`${year}-11-30`, `${year}-12-02`)).toBe(
			"30 Nov – 2 Dec"
		);
		expect(formatTripRange("2026-12-28", "2027-01-03")).toBe(
			"28 Dec 2026 – 3 Jan 2027"
		);
		expect(formatTripRange(`${year}-11-21`)).toBe("From 21 Nov");
		expect(formatTripRange(undefined, `${year}-11-25`)).toBe("Until 25 Nov");
		expect(formatTripRange(`${year}-11-21`, `${year}-11-21`)).toBe("21 Nov");
		expect(formatTripRange()).toBe("No dates yet");
	});

	it("formats relative days", () => {
		const today = "2026-11-15";
		expect(formatRelativeDay("2026-11-15", today)).toBe("Today");
		expect(formatRelativeDay("2026-11-16", today)).toBe("Tomorrow");
		expect(formatRelativeDay("2026-11-14", today)).toBe("Yesterday");
		expect(formatRelativeDay("2026-11-18", today)).toBe("In 3 days");
		expect(formatRelativeDay("2026-11-12", today)).toBe("3 days ago");
		expect(formatRelativeDay("2026-11-30", today)).toBe(
			formatDay("2026-11-30")
		);
	});
});

describe("times", () => {
	it("formats times and ranges", () => {
		expect(formatTime("8:5")).toBe("08:05");
		expect(formatTime("x")).toBe("");
		expect(formatTimeRange("08:40", "10:00")).toBe("08:40–10:00");
		expect(formatTimeRange("08:40")).toBe("08:40");
	});

	it("formats durations", () => {
		expect(formatDuration(45)).toBe("45 min");
		expect(formatDuration(60)).toBe("1 h");
		expect(formatDuration(80)).toBe("1 h 20 min");
		expect(formatDuration(0)).toBe("");
		expect(getMinutesBetween("08:40", "10:00")).toBe(80);
		expect(getMinutesBetween("10:00", "08:40")).toBe(0);
		expect(getMinutesBetween("x", "08:40")).toBe(0);
	});
});

describe("formatTripCountdown", () => {
	const base = { dayNumber: null, daysUntil: null, totalDays: null };

	it("labels each phase", () => {
		expect(
			formatTripCountdown({ ...base, daysUntil: 1, phase: "upcoming" })
		).toBe("Tomorrow");
		expect(
			formatTripCountdown({ ...base, daysUntil: 16, phase: "upcoming" })
		).toBe("In 16 days");
		expect(
			formatTripCountdown({ ...base, daysUntil: 120, phase: "upcoming" })
		).toBe("In 4 months");
		expect(
			formatTripCountdown({
				...base,
				dayNumber: 2,
				phase: "during",
				totalDays: 5,
			})
		).toBe("Day 2 of 5");
		expect(
			formatTripCountdown({ ...base, dayNumber: 2, phase: "during" })
		).toBe("Day 2");
		expect(
			formatTripCountdown({ ...base, endDate: `${year}-11-25`, phase: "ended" })
		).toBe("Ended 25 Nov");
		expect(formatTripCountdown({ ...base, phase: "completed" })).toBe(
			"Completed"
		);
		expect(formatTripCountdown({ ...base, phase: "archived" })).toBe(
			"Archived"
		);
		expect(formatTripCountdown({ ...base, phase: "undated" })).toBe(
			"No dates yet"
		);
	});
});

describe("misc", () => {
	it("formats file sizes", () => {
		expect(formatFileSize(840)).toBe("840 B");
		expect(formatFileSize(82_000)).toBe("80 KB");
		expect(formatFileSize(2_400_000)).toBe("2.3 MB");
	});

	it("formats enum labels", () => {
		expect(formatEnumLabel("backupPlan")).toBe("Backup plan");
		expect(formatEnumLabel("booked_externally")).toBe("Booked externally");
		expect(formatEnumLabel("flight")).toBe("Flight");
	});
});
