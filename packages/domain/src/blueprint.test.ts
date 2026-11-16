import { describe, expect, it } from "vitest";

import {
	getBlueprintBookingType,
	getBlueprintGroupType,
	getBlueprintPace,
	getBlueprintReadinessCategory,
	getBlueprintRiskSeverity,
	getBlueprintTravelStyle,
	matchesKeyword,
	resolveBlueprintDateRange,
} from "./blueprint";

describe("blueprint keyword matching", () => {
	it("matches whole words only", () => {
		expect(matchesKeyword("Bring valid ID", "id")).toBe(true);
		expect(matchesKeyword("Paid a deposit, video call", "id")).toBe(false);
		expect(matchesKeyword("Check passports", "passport")).toBe(true);
	});

	it("categorises readiness items without substring false positives", () => {
		expect(getBlueprintReadinessCategory("Renew passport")).toBe("documents");
		expect(getBlueprintReadinessCategory("Video the sunset")).toBe("schedule");
		expect(getBlueprintReadinessCategory("Pack light")).toBe("packing");
	});

	it("types bookings and risks", () => {
		expect(getBlueprintBookingType("Island hopping tour")).toBe("activity");
		expect(getBlueprintBookingType("Stay near the beach")).toBe("hotel");
		expect(getBlueprintRiskSeverity("Highlands trek")).toBe("medium");
		expect(getBlueprintRiskSeverity("High wave risk")).toBe("high");
	});
});

describe("resolveBlueprintDateRange", () => {
	it("uses the first two real ISO dates in order", () => {
		expect(
			resolveBlueprintDateRange(["2026-12-05 to 2026-12-09"], "2026-11-16")
		).toEqual({
			endDate: "2026-12-09",
			isPlaceholder: false,
			startDate: "2026-12-05",
		});
	});

	it("uses a single date as a one-day trip and sorts reversed dates", () => {
		expect(
			resolveBlueprintDateRange(["2026-12-05"], "2026-11-16")
		).toMatchObject({ endDate: "2026-12-05", startDate: "2026-12-05" });
		expect(
			resolveBlueprintDateRange(["2026-12-09 2026-12-05"], "2026-11-16")
		).toMatchObject({ endDate: "2026-12-09", startDate: "2026-12-05" });
	});

	it("ignores impossible dates and falls back to a placeholder range", () => {
		const range = resolveBlueprintDateRange(
			["sometime in December", "2026-13-45"],
			"2026-11-16"
		);

		expect(range).toEqual({
			endDate: "2026-12-02",
			isPlaceholder: true,
			startDate: "2026-11-30",
		});
	});
});

describe("blueprint profile helpers", () => {
	it("matches words, not substrings", () => {
		expect(getBlueprintPace(["Lightning storms expected"])).toBe("moderate");
		expect(getBlueprintPace(["Light, relaxed days"])).toBe("slow");
		expect(getBlueprintGroupType(["12 days of fun"])).toBe("solo");
		expect(getBlueprintGroupType(["2 travelers"])).toBe("couple");
		expect(getBlueprintGroupType(["Family of 4"])).toBe("family");
		expect(getBlueprintTravelStyle(["Budget backpacking"])).toBe("budget");
		expect(getBlueprintTravelStyle(["Fasting retreat"])).toBe("balanced");
	});
});
