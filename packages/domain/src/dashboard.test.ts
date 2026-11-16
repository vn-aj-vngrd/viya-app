import { describe, expect, it } from "vitest";

import {
	getCriticalOpenRisks,
	getNextBestAction,
	getUpcomingItineraryItems,
} from "./dashboard";
import { palawanDemoTrip } from "./demo/palawan";

describe("trip dashboard selectors", () => {
	it("uses the highest severity open risk as the next best action", () => {
		const action = getNextBestAction(palawanDemoTrip);

		expect(action.target).toBe("risks");
		expect(action.reason).toBe(
			"I do not see confirmed accommodation for the last night of the trip."
		);
	});

	it("returns critical open risks first", () => {
		const risks = getCriticalOpenRisks(palawanDemoTrip.risks);

		expect(risks.map((risk) => risk.id)).toEqual(["risk-final-hotel"]);
	});

	it("returns upcoming itinerary items in day order", () => {
		const items = getUpcomingItineraryItems(palawanDemoTrip, 2);

		expect(items.map((item) => item.id)).toEqual([
			"item-arrival-flight",
			"item-underground-river",
		]);
	});
});
