import { describe, expect, it } from "vitest";
import { sortTripPlacesForRouteReview } from "./trip-places";

describe("trip place ordering", () => {
	it("prioritizes assigned route stops before recent saved ideas", () => {
		const sortedPlaces = sortTripPlacesForRouteReview(
			[
				{ title: "Unassigned recent cafe", updatedAt: 500 },
				{ assignedDayId: "day-2", title: "Day two museum", updatedAt: 100 },
				{ title: "Unassigned older shop", updatedAt: 600 },
				{ assignedDayId: "day-1", title: "Day one dinner", updatedAt: 200 },
			],
			new Map([
				["day-1", 1],
				["day-2", 2],
			])
		);

		expect(sortedPlaces.map((place) => place.title)).toEqual([
			"Day one dinner",
			"Day two museum",
			"Unassigned older shop",
			"Unassigned recent cafe",
		]);
	});
});
