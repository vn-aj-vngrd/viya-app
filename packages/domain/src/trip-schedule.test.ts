import { describe, expect, it } from "vitest";

import {
	compareTimesOfDay,
	findItineraryConflicts,
	getDurationMinutes,
	normalizeTimeOfDay,
	planItineraryDaysForRange,
} from "./trip-schedule";

describe("time helpers", () => {
	it("normalizes and rejects times", () => {
		expect(normalizeTimeOfDay("9:05")).toBe("09:05");
		expect(normalizeTimeOfDay("24:00")).toBeNull();
		expect(normalizeTimeOfDay("mid-afternoon")).toBeNull();
	});

	it("sorts numerically, not lexically", () => {
		expect(compareTimesOfDay("9:00", "10:00")).toBeLessThan(0);
		expect(compareTimesOfDay("", "10:00")).toBeGreaterThan(0);
	});

	it("handles overnight durations", () => {
		expect(getDurationMinutes("22:00", "02:00")).toBe(240);
		expect(getDurationMinutes("09:00", "10:30")).toBe(90);
	});
});

describe("findItineraryConflicts", () => {
	it("reports overlaps only", () => {
		const conflicts = findItineraryConflicts([
			{ endTime: "10:00", id: "a", startTime: "09:00", title: "A" },
			{ endTime: "11:00", id: "b", startTime: "09:30", title: "B" },
			{ endTime: "12:00", id: "c", startTime: "11:00", title: "C" },
		]);

		expect(conflicts).toEqual([
			{ firstId: "a", reason: "overlap", secondId: "b" },
		]);
	});
});

describe("planItineraryDaysForRange", () => {
	it("creates every day for a new trip", () => {
		const plan = planItineraryDaysForRange("2026-12-01", "2026-12-03", []);

		expect(plan.create.map((day) => day.date)).toEqual([
			"2026-12-01",
			"2026-12-02",
			"2026-12-03",
		]);
	});

	it("shifts existing days when the start moves and fills the gap", () => {
		const plan = planItineraryDaysForRange("2026-12-02", "2026-12-05", [
			{ date: "2026-12-01", dayNumber: 1, hasItems: true, id: "d1" },
			{ date: "2026-12-02", dayNumber: 2, hasItems: true, id: "d2" },
		]);

		expect(plan.update).toEqual([
			{ date: "2026-12-02", dayNumber: 1, id: "d1" },
			{ date: "2026-12-03", dayNumber: 2, id: "d2" },
		]);
		expect(plan.create.map((day) => day.dayNumber)).toEqual([3, 4]);
	});

	it("removes empty overflow days but keeps days with items", () => {
		const plan = planItineraryDaysForRange("2026-12-01", "2026-12-01", [
			{ date: "2026-12-01", dayNumber: 1, hasItems: false, id: "d1" },
			{ date: "2026-12-02", dayNumber: 2, hasItems: false, id: "d2" },
			{ date: "2026-12-03", dayNumber: 3, hasItems: true, id: "d3" },
		]);

		expect(plan.remove).toEqual(["d2"]);
		expect(plan.update).toEqual([
			{ date: "2026-12-02", dayNumber: 2, id: "d3" },
		]);
	});
});

describe("planItineraryDaysForRange with a known previous start", () => {
	it("keeps a gap when the whole trip shifts", () => {
		const plan = planItineraryDaysForRange(
			"2026-12-03",
			"2026-12-07",
			[
				{ date: "2026-12-01", dayNumber: 1, hasItems: true, id: "d1" },
				{ date: "2026-12-03", dayNumber: 3, hasItems: true, id: "d3" },
			],
			"2026-12-01"
		);

		expect(plan.update).toEqual([
			{ date: "2026-12-03", dayNumber: 1, id: "d1" },
			{ date: "2026-12-05", dayNumber: 3, id: "d3" },
		]);
		expect(plan.create.map((day) => day.dayNumber)).toEqual([2, 4, 5]);
	});

	it("drops empty days that fall out of range and keeps ones with items", () => {
		const plan = planItineraryDaysForRange(
			"2026-12-01",
			"2026-12-02",
			[
				{ date: "2026-12-01", dayNumber: 1, hasItems: false, id: "d1" },
				{ date: "2026-12-02", dayNumber: 2, hasItems: false, id: "d2" },
				{ date: "2026-12-03", dayNumber: 3, hasItems: true, id: "d3" },
				{ date: "2026-12-04", dayNumber: 4, hasItems: false, id: "d4" },
			],
			"2026-12-01"
		);

		expect(plan.remove).toEqual(["d4"]);
		expect(plan.update).toEqual([]);
	});
});
