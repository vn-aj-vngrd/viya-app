import { describe, expect, it } from "vitest";

import {
	addDaysToKey,
	getBookingCounts,
	getBudgetDayCount,
	getCompanionCounts,
	getDateKeyInTimeZone,
	getDayOffset,
	getItineraryNowNext,
	getPlaceCounts,
	getReadinessProgress,
	getTravelerCount,
	getTripCountdown,
	getTripDayCount,
	getTripPhase,
	getVaultCounts,
	isBookingSecured,
	toReadinessItem,
} from "./trip-metrics";

describe("date math", () => {
	it("computes offsets and inclusive day counts", () => {
		expect(getDayOffset("2026-11-15", "2026-11-21")).toBe(6);
		expect(getDayOffset("2026-11-21", "2026-11-15")).toBe(-6);
		expect(getDayOffset("nope", "2026-11-15")).toBeNull();
		expect(getTripDayCount("2026-11-21", "2026-11-25")).toBe(5);
		expect(getTripDayCount("2026-11-21", undefined)).toBeNull();
	});

	it("adds days across month boundaries", () => {
		expect(addDaysToKey("2026-11-29", 3)).toBe("2026-12-02");
		expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
	});

	it("resolves the date key in a time zone, not UTC", () => {
		// 2026-11-14T20:00Z is already 15 Nov in Manila (UTC+8)
		const ms = Date.UTC(2026, 10, 14, 20);
		expect(getDateKeyInTimeZone(ms, "Asia/Manila")).toBe("2026-11-15");
		expect(getDateKeyInTimeZone(ms, "UTC")).toBe("2026-11-14");
	});

	it("does not drift across a DST change", () => {
		expect(getDayOffset("2026-03-07", "2026-03-09")).toBe(2);
	});
});

describe("bookings", () => {
	it("treats confirmed and bookedExternally as secured", () => {
		expect(isBookingSecured("confirmed")).toBe(true);
		expect(isBookingSecured("bookedExternally")).toBe(true);
		expect(isBookingSecured("target")).toBe(false);
	});

	it("counts bookings and picks the next to book", () => {
		const counts = getBookingCounts([
			{ cost: 1000, status: "confirmed", title: "A" },
			{ cost: 500, status: "bookedExternally", title: "B" },
			{ cost: 200, currency: "USD", status: "confirmed", title: "C" },
			{ startDateTime: "2026-11-22T08:00", status: "target", title: "Z" },
			{ startDateTime: "2026-11-21T08:00", status: "missing", title: "Y" },
			{ status: "cancelled", title: "X" },
		]);
		expect(counts).toMatchObject({
			booked: 3,
			bookedCost: 1500,
			cancelled: 1,
			toBook: 2,
			total: 6,
		});
		expect(counts.nextToBook?.title).toBe("Y");
	});
});

describe("readiness", () => {
	it("computes one percent formula", () => {
		const progress = getReadinessProgress(
			[
				{ priority: "high", status: "todo" },
				{ dueDate: "2026-11-01", priority: "low", status: "todo" },
				{ priority: "low", status: "done" },
				{ priority: "low", status: "done" },
				{ priority: "low", status: "ignored" },
			],
			"2026-11-15"
		);
		expect(progress).toEqual({
			active: 4,
			done: 2,
			highOpen: 1,
			open: 2,
			overdue: 1,
			percent: 50,
		});
		expect(getReadinessProgress([], "2026-11-15").percent).toBeNull();
	});

	it("maps a doc to a domain item", () => {
		const item = toReadinessItem({
			_id: "r1",
			aiReason: "",
			category: "bookings",
			description: "",
			dueDate: "",
			priority: "high",
			source: "user",
			status: "todo",
			title: "T",
			tripId: "t1",
		});
		expect(item.id).toBe("r1");
		expect(item.assignedToMemberId).toBeNull();
	});
});

describe("phase and countdown", () => {
	const dated = { endDate: "2026-11-25", startDate: "2026-11-21" };

	it("derives phase from dates", () => {
		expect(getTripPhase({ ...dated, status: "planning" }, "2026-11-15")).toBe(
			"upcoming"
		);
		expect(getTripPhase({ ...dated, status: "planning" }, "2026-11-22")).toBe(
			"during"
		);
		expect(getTripPhase({ ...dated, status: "planning" }, "2026-11-26")).toBe(
			"ended"
		);
		expect(getTripPhase({ status: "planning" }, "2026-11-26")).toBe("undated");
		expect(getTripPhase({ ...dated, status: "archived" }, "2026-11-22")).toBe(
			"archived"
		);
		expect(getTripPhase({ ...dated, status: "completed" }, "2026-11-15")).toBe(
			"completed"
		);
	});

	it("computes countdown numbers", () => {
		expect(
			getTripCountdown({ ...dated, status: "planning" }, "2026-11-15").daysUntil
		).toBe(6);
		const during = getTripCountdown(
			{ ...dated, status: "planning" },
			"2026-11-22"
		);
		expect(during.dayNumber).toBe(2);
		expect(during.totalDays).toBe(5);
	});

	it("counts budget days", () => {
		expect(getBudgetDayCount({}, "2026-11-15")).toBe(1);
		expect(getBudgetDayCount(dated, "2026-11-15")).toBe(5);
		expect(getBudgetDayCount(dated, "2026-11-23")).toBe(3);
		expect(getBudgetDayCount(dated, "2026-11-30")).toBe(1);
	});
});

describe("people, places, files", () => {
	it("resolves traveler count", () => {
		expect(getTravelerCount({ groupType: "solo" }, [])).toBe(1);
		expect(getTravelerCount({ groupType: "couple" }, [])).toBe(2);
		expect(
			getTravelerCount({ groupType: "family", travelerCount: 5 }, [])
		).toBe(5);
		expect(getTravelerCount({ groupType: "family" }, [])).toBeNull();
		expect(
			getTravelerCount({ groupType: "friends" }, [
				{ role: "traveler" },
				{ role: "emergencyContact" },
				{ role: "traveler" },
			])
		).toBe(2);
	});

	it("counts companions, places and vault files", () => {
		expect(
			getCompanionCounts([{ role: "traveler" }, { role: "localContact" }])
		).toEqual({ contacts: 1, travelers: 1 });
		expect(getPlaceCounts([{ assignedDayId: "d" }, {}])).toEqual({
			saved: 2,
			unassigned: 1,
		});
		expect(
			getVaultCounts(
				[{ kind: "document", linkedEntityId: "b" }, { kind: "receipt" }],
				[{ status: "missing" }, { status: "ready" }]
			)
		).toEqual({ files: 2, linked: 1, missingDocuments: 1 });
	});
});

describe("getItineraryNowNext", () => {
	const days = [
		{ date: "2026-11-21", id: "d1" },
		{ date: "2026-11-22", id: "d2" },
	];
	const items = [
		{ dayId: "d1", endTime: "10:00", startTime: "08:40" },
		{ dayId: "d1", startTime: "12:00" },
		{ dayId: "d1", startTime: "15:00" },
		{ dayId: "d2", startTime: "09:00" },
	];

	it("finds now, next and upcoming", () => {
		const result = getItineraryNowNext({
			days,
			items,
			nowTime: "09:30",
			todayKey: "2026-11-21",
		});
		expect(result.now?.startTime).toBe("08:40");
		expect(result.next?.startTime).toBe("12:00");
		expect(result.upcoming).toHaveLength(2);
		expect(result.todayItems).toHaveLength(3);
	});

	it("defaults to a 60 minute duration and has no now when idle", () => {
		const result = getItineraryNowNext({
			days,
			items,
			nowTime: "12:30",
			todayKey: "2026-11-21",
		});
		expect(result.now?.startTime).toBe("12:00");
		const idle = getItineraryNowNext({
			days,
			items,
			nowTime: "11:00",
			todayKey: "2026-11-21",
		});
		expect(idle.now).toBeNull();
	});
});
