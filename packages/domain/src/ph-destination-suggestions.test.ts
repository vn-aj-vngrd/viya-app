import { describe, expect, it } from "vitest";

import {
	getSeasonRiskNote,
	rankPhilippineDestinations,
	suggestForTrip,
	suggestTripWindow,
} from "./ph-destination-suggestions";
import {
	findPhDestinationByName,
	getPhDestination,
	phDestinations,
} from "./ph-destinations";

const TODAY = "2026-11-16";

describe("destination knowledge", () => {
	it("covers at least 20 destinations with unique ids", () => {
		const ids = new Set(phDestinations.map((destination) => destination.id));

		expect(phDestinations.length).toBeGreaterThanOrEqual(20);
		expect(ids.size).toBe(phDestinations.length);
	});

	it("matches free text names", () => {
		expect(findPhDestinationByName("El Nido, Palawan, Philippines")?.id).toBe(
			"el-nido"
		);
		expect(findPhDestinationByName("Tokyo")).toBeUndefined();
	});
});

describe("rankPhilippineDestinations", () => {
	it("avoids peak typhoon destinations in November and ranks Davao high", () => {
		const ranked = rankPhilippineDestinations({
			endDate: "2026-11-25",
			limit: 40,
			startDate: "2026-11-20",
			today: TODAY,
		});
		const ids = ranked.map((item) => item.destination.id);

		expect(ids.indexOf("davao")).toBeLessThan(ids.indexOf("batanes"));
		expect(
			ranked.find((i) => i.destination.id === "davao")?.badge.tone
		).not.toBe("avoid");
	});

	it("flags typhoon season with a caveat", () => {
		const [batanes] = rankPhilippineDestinations({
			endDate: "2026-09-12",
			limit: 40,
			startDate: "2026-09-08",
			today: TODAY,
		}).filter((item) => item.destination.id === "batanes");

		expect(batanes?.badge.tone).toBe("avoid");
		expect(batanes?.caveats.join(" ")).toContain("typhoon");
	});

	it("penalises hard destinations for families with kids", () => {
		const ranked = rankPhilippineDestinations({
			group: "family",
			limit: 40,
			startDate: "2027-02-01",
			endDate: "2027-02-04",
			today: TODAY,
		});
		const bohol = ranked.findIndex((item) => item.destination.id === "bohol");
		const sagada = ranked.findIndex((item) => item.destination.id === "sagada");

		expect(bohol).toBeLessThan(sagada);
	});

	it("rewards destinations that fit the budget and warns when over", () => {
		const tight = rankPhilippineDestinations({
			budgetAmount: 8000,
			limit: 40,
			startDate: "2027-03-01",
			endDate: "2027-03-04",
			today: TODAY,
		}).find((item) => item.destination.id === "el-nido");

		expect(tight?.caveats.some((c) => c.includes("over your budget"))).toBe(
			true
		);
	});

	it("prefers matching interests", () => {
		const [top] = rankPhilippineDestinations({
			interests: ["food", "culture"],
			startDate: "2027-01-10",
			endDate: "2027-01-13",
			today: TODAY,
		});

		expect(
			["food", "culture"].some((i) =>
				top?.destination.interests.includes(i as never)
			)
		).toBe(true);
	});

	it("excludes named destinations", () => {
		const ranked = rankPhilippineDestinations({
			exclude: ["Cebu"],
			limit: 40,
			today: TODAY,
		});

		expect(ranked.some((item) => item.destination.id === "cebu")).toBe(false);
	});

	it("uses the supplied date to pick the season", () => {
		const dry = rankPhilippineDestinations({
			limit: 40,
			startDate: "2027-04-01",
			endDate: "2027-04-05",
			today: TODAY,
		});
		const wet = rankPhilippineDestinations({
			limit: 40,
			startDate: "2026-09-01",
			endDate: "2026-09-05",
			today: TODAY,
		});
		const pick = (list: typeof dry) =>
			list.find((i) => i.destination.id === "boracay")?.badge.tone;

		expect(pick(dry)).toBe("best");
		expect(pick(wet)).toBe("avoid");
	});
});

describe("suggestTripWindow", () => {
	it("moves Batanes to the dry months", () => {
		const batanes = getPhDestination("batanes");
		const window = suggestTripWindow(batanes as never, TODAY, 4);

		expect(window.months.every((month) => [3, 4, 5].includes(month))).toBe(
			true
		);
	});
});

describe("getSeasonRiskNote and suggestForTrip", () => {
	it("returns a risk note and alternatives for a typhoon-month trip", () => {
		const result = suggestForTrip({
			budgetAmount: 40_000,
			destination: "Siargao, Philippines",
			endDate: "2026-12-05",
			startDate: "2026-12-01",
			today: TODAY,
			travelerCount: 2,
		});

		expect(result.riskNote?.isKnown).toBe(true);
		expect(result.riskNote?.badge.tone).toBe("avoid");
		expect(
			result.alternatives.every((a) => a.destination.id !== "siargao")
		).toBe(true);
		expect(result.alternatives.length).toBeGreaterThan(0);
	});

	it("handles unknown destinations", () => {
		const note = getSeasonRiskNote({ destination: "Tokyo", today: TODAY });

		expect(note.isKnown).toBe(false);
	});
});
