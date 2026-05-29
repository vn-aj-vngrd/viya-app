import { describe, expect, it } from "vitest";

import { getTripModuleSummaries } from "./trip-modules";

const baseInput = {
	bookings: [],
	budgetAmount: undefined,
	documents: [],
	expenses: [],
	itineraryDays: [],
	itineraryItems: [],
	moments: [],
	readinessScore: 0,
	risks: [],
	savedPlaces: [],
	vaultItems: [],
};

describe("trip module summaries", () => {
	it("returns every trip workspace module in navigation order", () => {
		const modules = getTripModuleSummaries(baseInput);

		expect(modules.map((module) => module.id)).toEqual([
			"itinerary",
			"places",
			"bookings",
			"documents",
			"budget",
			"readiness",
			"risks",
			"companions",
			"notes",
			"travel",
			"memories",
			"recap",
		]);
	});

	it("marks an empty planning workspace as empty or ready where appropriate", () => {
		const modules = getTripModuleSummaries(baseInput);
		const byId = new Map(modules.map((module) => [module.id, module]));

		expect(byId.get("itinerary")?.health).toBe("empty");
		expect(byId.get("places")?.health).toBe("empty");
		expect(byId.get("bookings")?.health).toBe("empty");
		expect(byId.get("documents")?.health).toBe("empty");
		expect(byId.get("budget")?.health).toBe("empty");
		expect(byId.get("readiness")?.health).toBe("empty");
		expect(byId.get("risks")?.health).toBe("ready");
		expect(byId.get("travel")?.health).toBe("empty");
		expect(byId.get("memories")?.health).toBe("empty");
		expect(byId.get("recap")?.health).toBe("empty");
	});

	it("marks confirmed bookings and high readiness as ready", () => {
		const modules = getTripModuleSummaries({
			...baseInput,
			bookings: [{ status: "confirmed", type: "hotel" }],
			readinessScore: 95,
		});
		const byId = new Map(modules.map((module) => [module.id, module]));

		expect(byId.get("bookings")?.health).toBe("ready");
		expect(byId.get("readiness")?.health).toBe("ready");
	});

	it("marks open risks as issue", () => {
		const modules = getTripModuleSummaries({
			...baseInput,
			risks: [{ status: "open" }],
		});
		const riskModule = modules.find((module) => module.id === "risks");

		expect(riskModule?.health).toBe("issue");
	});
});
