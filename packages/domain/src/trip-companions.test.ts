import { describe, expect, it } from "vitest";
import { sortTripCompanionsForCoordination } from "./trip-companions";

describe("trip companion ordering", () => {
	it("prioritizes coordinators and emergency contacts before travelers", () => {
		const sortedCompanions = sortTripCompanionsForCoordination([
			{ name: "Zara", role: "traveler" },
			{ name: "Ben", role: "emergencyContact" },
			{ name: "Maya", role: "organizer" },
			{ name: "Ana", role: "payer" },
			{ name: "Luis", role: "driver" },
		]);

		expect(sortedCompanions.map((companion) => companion.name)).toEqual([
			"Maya",
			"Ben",
			"Luis",
			"Ana",
			"Zara",
		]);
	});
});
