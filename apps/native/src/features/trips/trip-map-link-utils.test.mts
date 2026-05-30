import { describe, expect, it } from "bun:test";

import {
	getTripMapSearchUrl,
	hasTripMapSearchTarget,
} from "./trip-map-link-utils";

describe("trip map link helpers", () => {
	it("builds Apple Maps search links from coordinates and labels", () => {
		expect(
			getTripMapSearchUrl({
				latitude: 14.5995,
				longitude: 120.9842,
				label: "National Museum",
			})
		).toBe("https://maps.apple.com/?q=National%20Museum&ll=14.5995%2C120.9842");
	});

	it("falls back to address and location text when coordinates are unavailable", () => {
		expect(
			getTripMapSearchUrl({
				address: "Padre Burgos Ave, Manila",
				label: "National Museum",
				locationName: "Ermita",
			})
		).toBe(
			"https://maps.apple.com/?q=National%20Museum%2C%20Padre%20Burgos%20Ave%2C%20Manila%2C%20Ermita"
		);
		expect(hasTripMapSearchTarget({ locationName: "  " })).toBe(false);
	});
});
